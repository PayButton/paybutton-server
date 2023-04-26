import { redis } from 'redis/clientInstance'
import { Prisma } from '@prisma/client'
import { getTransactionValue } from 'services/transactionService'
import { AddressWithTransactionsWithPrices, fetchAllUserAddresses, fetchAddressById } from 'services/addressService'
import { RESPONSE_MESSAGES, PAYMENT_WEEK_KEY_FORMAT, KeyValueT } from 'constants/index'
import moment from 'moment'

export interface ChartData {
  labels: string[]
  datasets: [
    {
      data: number[] | Prisma.Decimal[]
      borderColor: string
    }
  ]
}

export interface PeriodData {
  revenue: ChartData
  payments: ChartData
  totalRevenue: Prisma.Decimal
  totalPayments: number
}

export interface DashboardData {
  thirtyDays: PeriodData
  year: PeriodData
  sevenDays: PeriodData
  all: PeriodData
  paymentList: Payment[]
  total: {
    revenue: Prisma.Decimal
    payments: number
    buttons: number
  }
}

export interface ButtonDisplayData {
  name: string
  id: string
}

export interface Payment {
  timestamp: number
  value: Prisma.Decimal
  networkId: number
  hash: string
  buttonDisplayDataList: ButtonDisplayData[]
}

const getPaymentsWeekKey = (addressId: string, payment: Payment): string => {
  return `${addressId}:payments:${moment.unix(payment.timestamp).format(PAYMENT_WEEK_KEY_FORMAT)}`
}

export const getUserUncachedAddresses = async (userId: string): Promise<AddressWithTransactionsWithPrices[]> => {
  const addresses = await fetchAllUserAddresses(userId, true) as AddressWithTransactionsWithPrices[]
  const ret: AddressWithTransactionsWithPrices[] = []
  for (const addr of addresses) {
    const keys = await getCachedWeekKeysForAddress(addr.id)
    if (keys.length === 0) {
      ret.push(addr)
    }
  }
  return ret
}

const getCachedWeekKeysForAddress = async (addressId: string): Promise<string[]> => {
  return await redis.keys(`${addressId}:payments:*`)
}

const getCachedWeekKeysForUser = async (userId: string): Promise<string[]> => {
  const addresses = await fetchAllUserAddresses(userId)
  let ret: string[] = []
  for (const addr of addresses) {
    ret = ret.concat(await getCachedWeekKeysForAddress(addr.id))
  }
  return ret
}

const getPaymentsFromAddress = async (address: AddressWithTransactionsWithPrices): Promise<Payment[]> => {
  const paymentList: Payment[] = []
  for (const t of address.transactions) {
    const value = (await getTransactionValue(t)).usd
    const txAddress = await fetchAddressById(t.addressId, true) as AddressWithPaybuttonsAndUserProfiles
    if (txAddress === undefined) throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_FOR_TRANSACTION_404.message)
    paymentList.push({
      timestamp: t.timestamp,
      value,
      networkId: address.networkId,
      hash: t.hash,
      buttonDisplayDataList: txAddress.paybuttons.map(
        (conn) => {
          return {
            name: conn.paybutton.name,
            id: conn.paybutton.id
          }
        }
      )
    })
  }

  return paymentList.filter((p) => p.value > new Prisma.Decimal(0))
}

export const getCachedPaymentsForUser = async (userId: string): Promise<Payment[]> => {
  const weekKeys = await getCachedWeekKeysForUser(userId)
  let allPayments: Payment[] = []
  for (const weekKey of weekKeys) {
    const paymentsString = await redis.get(weekKey)
    if (paymentsString === null) {
      throw new Error(RESPONSE_MESSAGES.CACHED_PAYMENT_NOT_FOUND_404.message)
    }
    allPayments = allPayments.concat(JSON.parse(paymentsString))
  }
  return allPayments
}

export const cacheAddress = async (address: AddressWithTransactionsWithPrices): Promise<Payment[]> => {
  const payments = await getPaymentsFromAddress(address)
  const paymentsByWeek: KeyValueT<Payment[]> = {}
  for (const payment of payments) {
    const weekKey = getPaymentsWeekKey(address.id, payment)
    if (weekKey in paymentsByWeek) {
      paymentsByWeek[weekKey].push(payment)
    } else {
      paymentsByWeek[weekKey] = [payment]
    }
  }

  await Promise.all(
    Object.keys(paymentsByWeek).map(async key =>
      await redis.set(key, JSON.stringify(paymentsByWeek[key]))
    )
  )
  return payments
}
