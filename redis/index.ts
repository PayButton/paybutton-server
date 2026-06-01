import { AddressPaymentInfo } from 'services/addressService'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { TransactionsWithPaybuttonsAndPrices } from 'services/transactionService'
import { fetchUsersForAddress } from 'services/userService'
import { cacheBalanceForAddress, clearBalanceCache, getBalanceForAddress, updateBalanceCacheFromTx } from './balanceCache'
import { clearDashboardCache, getUserDashboardData } from './dashboardCache'
import { appendPaybuttonToAddressesCache, cacheGroupedPayments, cacheManyTxs, generateAndCacheGroupedPaymentsAndInfoForAddress, getCachedPaymentsCountForUser, getPaymentList, initPaymentCache, removePaybuttonToAddressesCache } from './paymentCache'
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
  addressCreation: async (address: Address): Promise<void> => {
    const groupedPaymentsAndInfo = await generateAndCacheGroupedPaymentsAndInfoForAddress(address)
    await cacheGroupedPayments(groupedPaymentsAndInfo.groupedPayments)
    await cacheBalanceForAddress(groupedPaymentsAndInfo.info, address.address)
  },
  txCreation: async (tx: TransactionsWithPaybuttonsAndPrices): Promise<void> => {
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
  private static readonly pendingPromises = new Map<string, Map<MethodName, Promise<any>>>()

  private static async executeCall<T>(
    userId: string,
    methodName: MethodName,
    fn: () => Promise<T>
  ): Promise<T> {
    let userMap = this.pendingPromises.get(userId)
    if (userMap === undefined) {
      userMap = new Map()
      this.pendingPromises.set(userId, userMap)
    }

    const existing = userMap.get(methodName)
    if (existing !== undefined) {
      return await existing as T
    }

    const promise = fn()
    userMap.set(methodName, promise)

    try {
      return await promise
    } finally {
      userMap.delete(methodName)
      if (userMap.size === 0) {
        this.pendingPromises.delete(userId)
      }
    }
  }

  static async dashboardData (userId: string, timezone: string, buttonIds?: string[]): Promise<DashboardData> {
    return await this.executeCall(userId, 'dashboardData', async () => {
      return await getUserDashboardData(userId, timezone, buttonIds)
    })
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
    })
  }
}
