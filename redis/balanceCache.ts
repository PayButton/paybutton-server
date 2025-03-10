import { AddressPaymentInfo, generateAddressPaymentInfo } from 'services/addressService'
import { TransactionWithAddressAndPrices } from 'services/transactionService'
import { redis } from './clientInstance'

// ADDRESS:balance
const getBalanceKey = (addressString: string): string => {
  return `${addressString}:balance`
}

export const cacheBalanceForAddress = async (info: AddressPaymentInfo, addressString: string): Promise<void> => {
  const balanceKey = getBalanceKey(addressString)
  await redis.set(balanceKey, JSON.stringify(info))
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
    await cacheBalanceForAddress(paymentInfo, addressString)
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
  await cacheBalanceForAddress(cached, addressString)
}

export const clearBalanceCache = async (addressString: string): Promise<void> => {
  const key = getBalanceKey(addressString)
  await redis.del(key, () => {})
}
