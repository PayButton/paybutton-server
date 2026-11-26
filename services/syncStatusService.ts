import prisma from 'prisma-local/clientInstance'
import { NETWORK_SLUGS_FROM_IDS } from 'constants/index'
import { getSyncJobProgress, SyncJobProgress } from 'redis/syncProgress'

// An address flagged as syncing with no activity for this long is likely left
// over from a sync that crashed or hung.
export const STUCK_SYNCING_THRESHOLD_MS = 15 * 60 * 1000
const SYNCING_ADDRESSES_LIST_LIMIT = 50
// Counting unpriced txs scans the transactions table, so the admin page's
// polling reuses a recent count instead of running it every few seconds.
const UNPRICED_TXS_CACHE_MS = 60 * 1000

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
  unpricedTxs: number
  unpricedTxsCheckedAt: number
}

let unpricedTxsCache: { count: number, checkedAt: number } | undefined

async function countUnpricedTxs (): Promise<{ count: number, checkedAt: number }> {
  const now = Date.now()
  if (unpricedTxsCache === undefined || now - unpricedTxsCache.checkedAt > UNPRICED_TXS_CACHE_MS) {
    const count = await prisma.transaction.count({ where: { prices: { none: {} } } })
    unpricedTxsCache = { count, checkedAt: now }
  }
  return unpricedTxsCache
}

const countsByNetwork = (rows: Array<{ networkId: number, _count: { _all: number } }>): Record<number, number> =>
  Object.fromEntries(rows.map(r => [r.networkId, r._count._all]))

export async function fetchSyncStatus (): Promise<SyncStatus> {
  const now = Date.now()
  const stuckBefore = new Date(now - STUCK_SYNCING_THRESHOLD_MS)
  const [job, totals, syncing, stuck, withoutTxs, syncingRows, unpriced] = await Promise.all([
    getSyncJobProgress(),
    prisma.address.groupBy({ by: ['networkId'], _count: { _all: true } }),
    prisma.address.groupBy({ by: ['networkId'], where: { syncing: true }, _count: { _all: true } }),
    prisma.address.groupBy({ by: ['networkId'], where: { syncing: true, updatedAt: { lt: stuckBefore } }, _count: { _all: true } }),
    prisma.address.groupBy({ by: ['networkId'], where: { lastSynced: null }, _count: { _all: true } }),
    prisma.address.findMany({
      where: { syncing: true },
      orderBy: { updatedAt: 'asc' },
      take: SYNCING_ADDRESSES_LIST_LIMIT,
      select: { address: true, networkId: true, updatedAt: true }
    }),
    countUnpricedTxs()
  ])

  const totalsMap = countsByNetwork(totals)
  const syncingMap = countsByNetwork(syncing)
  const stuckMap = countsByNetwork(stuck)
  const withoutTxsMap = countsByNetwork(withoutTxs)

  const networks: Record<string, NetworkAddressStats> = {}
  for (const [id, slug] of Object.entries(NETWORK_SLUGS_FROM_IDS)) {
    const networkId = Number(id)
    networks[slug] = {
      total: totalsMap[networkId] ?? 0,
      syncing: syncingMap[networkId] ?? 0,
      stuck: stuckMap[networkId] ?? 0,
      withoutTxs: withoutTxsMap[networkId] ?? 0
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
    unpricedTxs: unpriced.count,
    unpricedTxsCheckedAt: unpriced.checkedAt
  }
}
