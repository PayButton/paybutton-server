import { Prisma } from '@prisma/client'
import { AddressPaymentInfo, getAddressPaymentInfo } from 'services/addressService'
import { redis } from './clientInstance'
import { Payment } from './types'

// ADDRESS:balance
const getBalanceKey = (addressString: string): string => {
  return `${addressString}:balance`
}

export const cacheAddressPaymentInfo = async (addressString: string, info: AddressPaymentInfo): Promise<void> => {
  const balanceKey = getBalanceKey(addressString)
  await redis.set(balanceKey, JSON.stringify(info))
}

export const cacheBalanceFromPayments = async (addressString: string, payments: Payment[]): Promise<void> => {
  const paymentsSum = payments.reduce((prev, curr) => prev.plus(curr.value), new Prisma.Decimal(0))
  const info: AddressPaymentInfo = {
    balance: paymentsSum,
    paymentCount: payments.length
  }
  await cacheAddressPaymentInfo(addressString, info)
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
    paymentInfo = await getAddressPaymentInfo(addressString)
    await cacheAddressPaymentInfo(addressString, paymentInfo)
  }
  return paymentInfo
}
