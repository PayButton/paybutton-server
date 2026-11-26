import { AddressPaymentInfo, generateAddressPaymentInfo } from 'services/addressService'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { fetchTransactionsWithPaybuttonsAndPricesTouchedSince, TransactionsWithPaybuttonsAndPrices } from 'services/transactionService'
import { fetchUsersForAddress } from 'services/userService'
import { CACHE_CATCH_UP_MARGIN_MS, CACHE_CATCH_UP_MAX_ROUNDS, CACHE_REBUILD_FAILURE_BACKOFF_MS } from 'constants/index'
import { clearBalanceCache, getBalanceForAddress, getBalanceKey, updateBalanceCacheFromTx } from './balanceCache'
import { bumpCacheGeneration, getCacheBuiltKey, getCacheClearEpoch, getCacheGeneration, setCacheEntriesIfUnchanged } from './cacheGeneration'
import { clearDashboardCache, getUserDashboardData } from './dashboardCache'
import { appendPaybuttonToAddressesCache, cacheManyTxs, clearPaymentCacheForAddress, generateAndCacheGroupedPaymentsAndInfoForAddress, getCachedPaymentsCountForUser, getPatchedWeekEntries, getPaymentList, initPaymentCache, removePaybuttonToAddressesCache } from './paymentCache'
import { DashboardData, Payment } from './types'
import { Address } from '@prisma/client'

interface PaybuttonCreationParams {
  paybutton: PaybuttonWithAddresses
  addressStringList: string[]
  userId: string
}

type PaybuttonUpdateParams = PaybuttonCreationParams
type PaybuttonDeletionParams = PaybuttonCreationParams

// Rebuilds running in this process, by address: concurrent callers (a dashboard
// load, each new tx for the address) share one instead of each reading the
// address's whole history from the DB.
const rebuildsInFlight = new Map<string, Promise<boolean>>()
// When each address's last rebuild failed, so requests back off instead of
// restarting the full read on every dashboard load or new tx.
const rebuildFailedAt = new Map<string, number>()

/**
 * Rebuilds the address's payment and balance caches from the DB. If the address
 * changed while its txs were being read (a new tx, a balance invalidation), the
 * result is written anyway and the txs touched since the read started are then
 * re-applied. Discarding it instead would make a busy address, whose rebuild can
 * take many minutes, never get cached. If its payment cache was cleared while
 * the rebuild ran, nothing is written: every write requires the clear epoch read
 * at the start, so none can restore weeks or the built marker over a clear.
 * Returns whether the result was written.
 */
const rebuildAddressCache = async (address: Address): Promise<boolean> => {
  const addressString = address.address
  const since = new Date(Date.now() - CACHE_CATCH_UP_MARGIN_MS)
  const clearEpoch = await getCacheClearEpoch(addressString)
  const startGeneration = await getCacheGeneration(addressString)
  const { groupedPayments, info } = await generateAndCacheGroupedPaymentsAndInfoForAddress(address)
  const entries: Array<[string, string]> = [
    ...Object.entries(groupedPayments).map(([key, payments]): [string, string] => [key, JSON.stringify(payments)]),
    [getBalanceKey(addressString), JSON.stringify(info)],
    [getCacheBuiltKey(addressString), '1']
  ]
  if (await setCacheEntriesIfUnchanged(addressString, entries, { generation: startGeneration, clearEpoch })) return true

  if (!(await setCacheEntriesIfUnchanged(addressString, entries, { clearEpoch }))) {
    console.log(`[CACHE] Discarded rebuild of ${addressString}: its payment cache was cleared while it was being rebuilt.`)
    return false
  }
  try {
    for (let round = 1; round <= CACHE_CATCH_UP_MAX_ROUNDS; round++) {
      const generation = await getCacheGeneration(addressString)
      const touched = await fetchTransactionsWithPaybuttonsAndPricesTouchedSince(address.id, since)
      const balance = await generateAddressPaymentInfo(addressString)
      const patched: Array<[string, string]> = [
        ...await getPatchedWeekEntries(addressString, touched),
        [getBalanceKey(addressString), JSON.stringify(balance)]
      ]
      // Only onto the cache written above: if it was cleared meanwhile, the next
      // read rebuilds it, and writing a few weeks would make it look complete.
      if (await setCacheEntriesIfUnchanged(addressString, patched, { generation, requireBuilt: true, clearEpoch })) {
        console.log(`[CACHE] Rebuild of ${addressString} caught up ${touched.length} txs changed while it was reading.`)
        return true
      }
      if ((await getCacheClearEpoch(addressString)) !== clearEpoch) return true
    }
  } catch (err) {
    // What was published lacks the changes made during the read; don't leave
    // it passing for a complete cache. The next request rebuilds it.
    await clearPaymentCacheForAddress(addressString).catch(() => {})
    await clearBalanceCache(addressString).catch(() => {})
    throw err
  }
  console.warn(`[CACHE] Rebuild of ${addressString} still changing after ${CACHE_CATCH_UP_MAX_ROUNDS} catch-up rounds; recent txs may be missing until its next invalidation.`)
  return true
}

/** Whether a rebuild request for the address would be skipped for backoff. */
export const isAddressRebuildBackedOff = (addressString: string): boolean => {
  if (rebuildsInFlight.has(addressString)) return false
  const failedAt = rebuildFailedAt.get(addressString)
  return failedAt !== undefined && Date.now() - failedAt < CACHE_REBUILD_FAILURE_BACKOFF_MS
}

const clearDashboardsForAddress = async (addressString: string): Promise<void> => {
  const users = await fetchUsersForAddress(addressString)
  await Promise.all(users.map(async u => await clearDashboardCache(u.id)))
}

/**
 * Drops the address's balance and its users' dashboard caches, which were built
 * without a tx that couldn't be added to its (unbuilt) payment cache.
 */
export const dropCachesBuiltWithoutAddressTxs = async (addressString: string): Promise<void> => {
  await clearBalanceCache(addressString)
  await clearDashboardsForAddress(addressString)
}

export const CacheSet = {
  // Rebuilds the address's payment and balance caches from the DB, sharing a
  // rebuild already running for it. Returns false without rebuilding if its last
  // rebuild failed less than CACHE_REBUILD_FAILURE_BACKOFF_MS ago.
  addressCreation: async (address: Address): Promise<boolean> => {
    const addressString = address.address
    const inFlight = rebuildsInFlight.get(addressString)
    if (inFlight !== undefined) return await inFlight
    if (isAddressRebuildBackedOff(addressString)) return false

    const run = (async () => {
      let written: boolean
      try {
        written = await rebuildAddressCache(address)
        rebuildFailedAt.delete(addressString)
      } catch (err) {
        rebuildFailedAt.set(addressString, Date.now())
        throw err
      } finally {
        rebuildsInFlight.delete(addressString)
      }
      if (!written) return false
      // Dashboards built while the address was uncached left its payments out.
      await clearDashboardsForAddress(addressString)
      return true
    })()
    rebuildsInFlight.set(addressString, run)
    return await run
  },
  txCreation: async (tx: TransactionsWithPaybuttonsAndPrices): Promise<void> => {
    // A rebuild already reading this address's txs may have missed this one.
    await bumpCacheGeneration(tx.address.address)
    const cacheInitialized = await initPaymentCache(tx.address)
    if (cacheInitialized) return
    void await cacheManyTxs([tx])
    const userIds = await fetchUsersForAddress(tx.address.address)
    await updateBalanceCacheFromTx(tx)
    await Promise.all(
      userIds.map(async u => {
        await clearDashboardCache(u.id)
      })
    )
  },
  txsCreation: async (txs: TransactionsWithPaybuttonsAndPrices[]): Promise<void> => {
    void await cacheManyTxs(txs)
    const differentAddresses = new Set(txs.map(tx => tx.address.address))
    for (const addr of differentAddresses) {
      const userIds = await fetchUsersForAddress(addr)
      await Promise.all(
        userIds.map(async u => {
          await clearDashboardCache(u.id)
        })
      )
      await clearBalanceCache(addr)
    }
  },
  // After a bulk (on-demand) sync committed txs for these addresses without
  // touching the cache: drop their payment, balance and users' dashboard caches
  // so they are rebuilt from the DB, now including the synced txs.
  addressesSynced: async (addressStringList: string[]): Promise<void> => {
    const userIds = new Set<string>()
    for (const addressString of addressStringList) {
      await clearPaymentCacheForAddress(addressString)
      await clearBalanceCache(addressString)
      const users = await fetchUsersForAddress(addressString)
      users.forEach(u => userIds.add(u.id))
    }
    await Promise.all(
      [...userIds].map(async id => {
        await clearDashboardCache(id)
      })
    )
  },
  paybuttonCreation: async ({ paybutton, addressStringList, userId }: PaybuttonCreationParams): Promise<void> => {
    await appendPaybuttonToAddressesCache(
      addressStringList,
      {
        name: paybutton.name,
        id: paybutton.id
      }
    )
    await clearDashboardCache(userId)
  },
  paybuttonUpdate: async ({ paybutton, addressStringList, userId }: PaybuttonUpdateParams): Promise<void> => {
    await appendPaybuttonToAddressesCache(
      addressStringList,
      {
        name: paybutton.name,
        id: paybutton.id
      }
    )
    await clearDashboardCache(userId)
  },
  paybuttonDeletion: async ({ paybutton, addressStringList, userId }: PaybuttonDeletionParams): Promise<void> => {
    await removePaybuttonToAddressesCache(addressStringList, paybutton.id)
    await clearDashboardCache(userId)
  }
}

type MethodName = 'dashboardData' | 'paymentList' | 'addressBalance' | 'paymentsCount'

export class CacheGet {
  // In-flight calls keyed by method + arguments. Concurrent callers with the
  // same key share one promise instead of failing or duplicating the work.
  private static readonly pendingCalls = new Map<string, Promise<unknown>>()

  private static async executeCall<T>(
    key: string,
    methodName: MethodName,
    fn: () => Promise<T>,
    args: unknown[] = []
  ): Promise<T> {
    const callKey = JSON.stringify([methodName, key, ...args])
    const pending = this.pendingCalls.get(callKey)
    if (pending !== undefined) {
      return await (pending as Promise<T>)
    }

    const promise = (async () => {
      try {
        return await fn()
      } finally {
        this.pendingCalls.delete(callKey)
      }
    })()
    this.pendingCalls.set(callKey, promise)
    return await promise
  }

  static async dashboardData (userId: string, timezone: string, buttonIds?: string[]): Promise<DashboardData> {
    return await this.executeCall(userId, 'dashboardData', async () => {
      return await getUserDashboardData(userId, timezone, buttonIds)
    }, [timezone, buttonIds ?? []])
  }

  static async paymentList (userId: string): Promise<Payment[]> {
    return await this.executeCall(userId, 'paymentList', async () => {
      return await getPaymentList(userId)
    })
  }

  static async addressBalance (addressString: string): Promise<AddressPaymentInfo> {
    return await this.executeCall(addressString, 'addressBalance', async () => {
      return await getBalanceForAddress(addressString)
    })
  }

  static async paymentsCount (userId: string, timezone: string): Promise<number> {
    return await this.executeCall(userId, 'paymentsCount', async () => {
      return await getCachedPaymentsCountForUser(userId, timezone)
    }, [timezone])
  }
}
