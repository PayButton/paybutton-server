import { AddressPaymentInfo, AddressWithTransactionsWithPrices } from 'services/addressService'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { TransactionWithAddressAndPrices } from 'services/transactionService'
import { fetchUsersForAddress } from 'services/userService'
import { cacheBalanceForAddress, clearBalanceCache, getBalanceForAddress, updateBalanceCacheFromTx } from './balanceCache'
import { clearDashboardCache, getUserDashboardData } from './dashboardCache'
import { appendPaybuttonToAddressesCache, cacheGroupedPayments, cacheManyTxs, generateGroupedPaymentsForAddress, getCachedPaymentsCountForUser, getPaymentList, initPaymentCache, removePaybuttonToAddressesCache } from './paymentCache'
import { DashboardData, Payment } from './types'

interface PaybuttonCreationParams {
  paybutton: PaybuttonWithAddresses
  addressStringList: string[]
  userId: string
}

type PaybuttonUpdateParams = PaybuttonCreationParams
type PaybuttonDeletionParams = PaybuttonCreationParams

export const CacheSet = {
  addressCreation: async (address: AddressWithTransactionsWithPrices): Promise<void> => {
    const paymentsGroupedByKey = await generateGroupedPaymentsForAddress(address)
    await cacheGroupedPayments(paymentsGroupedByKey)
    await cacheBalanceForAddress(address)
  },
  txCreation: async (tx: TransactionWithAddressAndPrices): Promise<void> => {
    const addressString = tx.address.address
    const cacheInitialized = await initPaymentCache(addressString)
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
  txsCreation: async (txs: TransactionWithAddressAndPrices[]): Promise<void> => {
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

// Will get or, if it does not exists, set
export const CacheGet = {
  dashboardData: async (userId: string): Promise<DashboardData> => {
    return await getUserDashboardData(userId)
  },
  paymentList: async (userId: string): Promise<Payment[]> => {
    return await getPaymentList(userId)
  },
  addressBalance: async (addressString: string): Promise<AddressPaymentInfo> => {
    return await getBalanceForAddress(addressString)
  },
  paymentsCount: async (userId: string) => {
    return await getCachedPaymentsCountForUser(userId)
  }
}
