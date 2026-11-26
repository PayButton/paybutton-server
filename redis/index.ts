import { AddressPaymentInfo } from 'services/addressService'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { TransactionsWithPaybuttonsAndPrices } from 'services/transactionService'
import { fetchUsersForAddress } from 'services/userService'
import { clearBalanceCache, getBalanceForAddress, getBalanceKey, updateBalanceCacheFromTx } from './balanceCache'
import { bumpCacheGeneration, getCacheGeneration, setIfGenerationUnchanged } from './cacheGeneration'
import { clearDashboardCache, getUserDashboardData } from './dashboardCache'
import { appendPaybuttonToAddressesCache, cacheManyTxs, clearPaymentCacheForAddress, generateAndCacheGroupedPaymentsAndInfoForAddress, getCachedPaymentsCountForUser, getPaymentList, initPaymentCache, removePaybuttonToAddressesCache } from './paymentCache'
import { DashboardData, Payment } from './types'
import { Address } from '@prisma/client'

interface PaybuttonCreationParams {
  paybutton: PaybuttonWithAddresses
  addressStringList: string[]
  userId: string
}

type PaybuttonUpdateParams = PaybuttonCreationParams
type PaybuttonDeletionParams = PaybuttonCreationParams

export const CacheSet = {
  // Rebuilds the address's payment and balance caches from the DB. The result is
  // written only if the address wasn't invalidated while the DB was being read;
  // otherwise it's discarded and the next read rebuilds it.
  addressCreation: async (address: Address): Promise<boolean> => {
    const generation = await getCacheGeneration(address.address)
    const { groupedPayments, info } = await generateAndCacheGroupedPaymentsAndInfoForAddress(address)
    const written = await setIfGenerationUnchanged(address.address, generation, [
      ...Object.entries(groupedPayments).map(([key, payments]): [string, string] => [key, JSON.stringify(payments)]),
      [getBalanceKey(address.address), JSON.stringify(info)]
    ])
    if (!written) {
      console.log(`[CACHE] Discarded rebuild of ${address.address}: invalidated while it was being rebuilt.`)
    }
    return written
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
