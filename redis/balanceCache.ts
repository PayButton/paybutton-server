import { Prisma } from '@prisma/client'
import { AddressPaymentInfo, AddressWithTransactionsWithPrices, generateAddressPaymentInfo } from 'services/addressService'
import { TransactionWithAddressAndPrices } from 'services/transactionService'
import { redis } from './clientInstance'

// ADDRESS:balance
const getBalanceKey = (addressString: string): string => {
  return `${addressString}:balance`
}

export const cacheAddressPaymentInfo = async (addressString: string, info: AddressPaymentInfo): Promise<void> => {
  const balanceKey = getBalanceKey(addressString)
  await redis.set(balanceKey, JSON.stringify(info))
}

export const cacheBalanceForAddress = async (address: AddressWithTransactionsWithPrices): Promise<void> => {
  let balance = new Prisma.Decimal(0)
  for (const tx of address.transactions) {
    balance = balance.plus(tx.amount)
  }
  const info: AddressPaymentInfo = {
    balance,
    paymentCount: address.transactions.filter(tx => tx.amount.gt(0)).length
  }
  await cacheAddressPaymentInfo(address.address, info)
}

export const getCachedBalanceForAddress = async (addressString: string): Promise<AddressPaymentInfo | null> => {
  const balanceKey = getBalanceKey(addressString)
  const paymentInfoString = await redis.get(balanceKey)
  const paymentInfo: AddressPaymentInfo | null = (paymentInfoString === null) ? null : JSON.parse(paymentInfoString)
  return paymentInfo
}

export const getBalanceForAddress = async (addressString: string): Promise<AddressPaymentInfo> => {
  let paymentInfo = await getCachedBalanceForAddress(addressString)
  if (paymentInfo === null) {
    paymentInfo = await generateAddressPaymentInfo(addressString)
    await cacheAddressPaymentInfo(addressString, paymentInfo)
  }
  return paymentInfo
}

export const updateBalanceCacheFromTx = async (tx: TransactionWithAddressAndPrices): Promise<void> => {
  const addressString = tx.address.address
  const cached = await getCachedBalanceForAddress(addressString)
  if (cached === null) {
    return
  }
  cached.balance = tx.amount.plus(cached.balance)
  cached.paymentCount += 1
  await cacheAddressPaymentInfo(addressString, cached)
}

export const clearBalanceCache = async (addressString: string): Promise<void> => {
  const key = getBalanceKey(addressString)
  await redis.del(key, () => {})
}
