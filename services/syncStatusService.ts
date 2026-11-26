import prisma from 'prisma-local/clientInstance'
import { NETWORK_SLUGS_FROM_IDS } from 'constants/index'
import { getSyncJobProgress, SyncJobProgress } from 'redis/syncProgress'

// An address flagged as syncing with no activity for this long is likely left
// over from a sync that crashed or hung.
export const STUCK_SYNCING_THRESHOLD_MS = 15 * 60 * 1000
const SYNCING_ADDRESSES_LIST_LIMIT = 50
// Counting unpriced txs scans the whole transactions table, which can take
// longer than the reverse proxy's request timeout. It is refreshed in the
// background and requests only ever return the last finished count.
const UNPRICED_TXS_CACHE_MS = 5 * 60 * 1000

export interface NetworkAddressStats {
  total: number
  syncing: number
  stuck: number
  // lastSynced is the newest tx's timestamp, so null means no tx has been synced for the address.
  withoutTxs: number
}

export interface SyncingAddress {
  address: string
  network: string
  // Last time the row changed (the syncing flag being set, or lastSynced moving).
  since: number
  stuck: boolean
}

export interface SyncStatus {
  serverTime: number
  job: SyncJobProgress | null
  networks: Record<string, NetworkAddressStats>
  syncingAddresses: SyncingAddress[]
  // null until the first background count finishes.
  unpricedTxs: number | null
  unpricedTxsCheckedAt: number | null
}

let unpricedTxsCache: { count: number, checkedAt: number } | undefined
let unpricedTxsInFlight: Promise<void> | undefined

// Starts a background recount when the cached one is missing or old, without
// waiting for it; concurrent callers share the one in-flight query.
function refreshUnpricedTxsCount (): void {
  const fresh = unpricedTxsCache !== undefined && Date.now() - unpricedTxsCache.checkedAt <= UNPRICED_TXS_CACHE_MS
  if (fresh || unpricedTxsInFlight !== undefined) return
  const startedAt = Date.now()
  unpricedTxsInFlight = (async () => {
    try {
      // NOT EXISTS lets MySQL anti-join on the transactionId FK index; Prisma's
      // `prices: { none: {} }` compiles to a NOT IN subquery that is far slower.
      const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*) AS count FROM Transaction t
        WHERE NOT EXISTS (SELECT 1 FROM PricesOnTransactions p WHERE p.transactionId = t.id)
      `
      unpricedTxsCache = { count: Number(rows[0]?.count ?? 0), checkedAt: startedAt }
    } catch (err: any) {
      console.error(`[syncStatus] failed to count unpriced txs: ${err?.message as string}`)
    } finally {
      unpricedTxsInFlight = undefined
    }
  })()
}

interface AddressStatsRow {
  networkId: number
  total: bigint | number
  syncing: bigint | number | null
  stuck: bigint | number | null
  withoutTxs: bigint | number | null
}

export async function fetchSyncStatus (): Promise<SyncStatus> {
  const now = Date.now()
  const stuckBefore = new Date(now - STUCK_SYNCING_THRESHOLD_MS)
  refreshUnpricedTxsCount()
  const [job, addressStats, syncingRows] = await Promise.all([
    getSyncJobProgress(),
    // One pass over Address instead of a separate groupBy per counter.
    prisma.$queryRaw<AddressStatsRow[]>`
      SELECT
        networkId,
        COUNT(*) AS total,
        SUM(syncing = 1) AS syncing,
        SUM(syncing = 1 AND updatedAt < ${stuckBefore}) AS stuck,
        SUM(lastSynced IS NULL) AS withoutTxs
      FROM Address
      GROUP BY networkId
    `,
    prisma.address.findMany({
      where: { syncing: true },
      orderBy: { updatedAt: 'asc' },
      take: SYNCING_ADDRESSES_LIST_LIMIT,
      select: { address: true, networkId: true, updatedAt: true }
    })
  ])

  const statsByNetwork = Object.fromEntries(addressStats.map(r => [Number(r.networkId), r]))

  const networks: Record<string, NetworkAddressStats> = {}
  for (const [id, slug] of Object.entries(NETWORK_SLUGS_FROM_IDS)) {
    const networkId = Number(id)
    const row = statsByNetwork[networkId]
    networks[slug] = {
      total: Number(row?.total ?? 0),
      syncing: Number(row?.syncing ?? 0),
      stuck: Number(row?.stuck ?? 0),
      withoutTxs: Number(row?.withoutTxs ?? 0)
    }
  }

  return {
    serverTime: now,
    job,
    networks,
    syncingAddresses: syncingRows.map(a => ({
      address: a.address,
      network: NETWORK_SLUGS_FROM_IDS[a.networkId] ?? String(a.networkId),
      since: a.updatedAt.getTime(),
      stuck: a.updatedAt < stuckBefore
    })),
    unpricedTxs: unpricedTxsCache?.count ?? null,
    unpricedTxsCheckedAt: unpricedTxsCache?.checkedAt ?? null
  }
}
