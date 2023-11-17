import { AddressWithTransactionsWithPrices } from 'services/addressService'
import { cacheBalanceFromPayments } from './balanceCache'
import { cacheGroupedPayments, generateGroupedPaymentsForAddress } from './paymentCache'

export const CacheSet = {
  addressCreation: async (address: AddressWithTransactionsWithPrices): Promise<void> => {
    const paymentsGroupedByKey = await generateGroupedPaymentsForAddress(address)
    await cacheGroupedPayments(paymentsGroupedByKey)
    await cacheBalanceFromPayments(address.address, Object.values(paymentsGroupedByKey).reduce((prev, curr) => prev.concat(curr), []))
  },
  txCreation: async (): Promise<void> => {
  },
  txsCreation: async (): Promise<void> => {
  },
  paybuttonCreation: async (): Promise<void> => {
  },
  paybuttonUpdate: async (): Promise<void> => {
  },
  paybuttonDeletion: async (): Promise<void> => {
  }
}

// Will get or, if it does not exists, set
export const CacheGet = {
  dashboardData: async (): Promise<void> => {
  },
  paymentsList: async (): Promise<void> => {
  },
  addressBalance: async (): Promise<void> => {
  }
}
