import { AddressPaymentInfo, generateAddressPaymentInfo } from 'services/addressService'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { fetchTransactionsWithPaybuttonsAndPricesTouchedSince, TransactionsWithPaybuttonsAndPrices } from 'services/transactionService'
import { fetchUsersForAddress } from 'services/userService'
import { CACHE_CATCH_UP_MARGIN_MS, CACHE_CATCH_UP_MAX_ROUNDS, CACHE_REBUILD_FAILURE_BACKOFF_MS } from 'constants/index'
import { clearBalanceCache, getBalanceForAddress, getBalanceKey, updateBalanceCacheFromTx } from './balanceCache'
import { bumpCacheGeneration, getCacheBuiltKey, getCacheGeneration, setIfGenerationUnchanged } from './cacheGeneration'
import { redis } from './clientInstance'
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
 * changed while its txs were being read (a new tx, prices linked, a sync), the
 * result is written anyway and the txs touched since the read started are then
 * re-applied. Discarding it instead would make a busy address, whose rebuild can
 * take many minutes, never get cached.
 */
const rebuildAddressCache = async (address: Address): Promise<void> => {
  const addressString = address.address
  const since = new Date(Date.now() - CACHE_CATCH_UP_MARGIN_MS)
  const startGeneration = await getCacheGeneration(addressString)
  const { groupedPayments, info } = await generateAndCacheGroupedPaymentsAndInfoForAddress(address)
  const entries: Array<[string, string]> = [
    ...Object.entries(groupedPayments).map(([key, payments]): [string, string] => [key, JSON.stringify(payments)]),
    [getBalanceKey(addressString), JSON.stringify(info)],
    [getCacheBuiltKey(addressString), '1']
  ]
  if (await setIfGenerationUnchanged(addressString, startGeneration, entries)) return

  await Promise.all(entries.map(async ([key, value]) => await redis.set(key, value)))
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
    if (await setIfGenerationUnchanged(addressString, generation, patched, { requireBuilt: true })) {
      console.log(`[CACHE] Rebuild of ${addressString} caught up ${touched.length} txs changed while it was reading.`)
      return
    }
    if ((await redis.get(getCacheBuiltKey(addressString))) === null) return
  }
  console.warn(`[CACHE] Rebuild of ${addressString} still changing after ${CACHE_CATCH_UP_MAX_ROUNDS} catch-up rounds; recent txs may be missing until its next invalidation.`)
}

const clearDashboardsForAddress = async (addressString: string): Promise<void> => {
  const users = await fetchUsersForAddress(addressString)
  await Promise.all(users.map(async u => await clearDashboardCache(u.id)))
}

export const CacheSet = {
  // Rebuilds the address's payment and balance caches from the DB, sharing a
  // rebuild already running for it. Returns false without rebuilding if its last
  // rebuild failed less than CACHE_REBUILD_FAILURE_BACKOFF_MS ago.
  addressCreation: async (address: Address): Promise<boolean> => {
    const addressString = address.address
    const inFlight = rebuildsInFlight.get(addressString)
    if (inFlight !== undefined) return await inFlight
    const failedAt = rebuildFailedAt.get(addressString)
    if (failedAt !== undefined && Date.now() - failedAt < CACHE_REBUILD_FAILURE_BACKOFF_MS) return false

    const run = (async () => {
      try {
        await rebuildAddressCache(address)
        rebuildFailedAt.delete(addressString)
      } catch (err) {
        rebuildFailedAt.set(addressString, Date.now())
        throw err
      } finally {
        rebuildsInFlight.delete(addressString)
      }
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
