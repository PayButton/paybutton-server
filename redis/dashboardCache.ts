import { redis } from 'redis/clientInstance'
import { Prisma } from '@prisma/client'
import { getTransactionValue, TransactionWithAddressAndPrices, TransactionWithPrices } from 'services/transactionService'
import { AddressWithTransactionsWithPrices, fetchAllUserAddresses, fetchAddressById, AddressWithPaybuttons } from 'services/addressService'
import { fetchPaybuttonArrayByUserId } from 'services/paybuttonService'

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
  buttons: PaymentDataByButton
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
  isXec?: boolean
  isBch?: boolean
  lastPayment?: number
}

export interface Payment {
  timestamp: number
  value: Prisma.Decimal
  networkId: number
  hash: string
  buttonDisplayDataList: ButtonDisplayData[]
}

export interface ButtonData {
  displayData: ButtonDisplayData
  total: {
    revenue: Prisma.Decimal
    payments: number
  }
}

export interface PaymentDataByButton {
  [id: string]: ButtonData
}

const getPaymentsWeekKey = (addressId: string, timestamp: number): string => {
  return `${addressId}:payments:${moment.unix(timestamp).format(PAYMENT_WEEK_KEY_FORMAT)}`
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

const getPaymentFromTx = async (tx: TransactionWithPrices): Promise<Payment> => {
  const value = (await getTransactionValue(tx)).usd
  const txAddress = await fetchAddressById(tx.addressId, true) as AddressWithPaybuttons
  if (txAddress === undefined) throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_FOR_TRANSACTION_404.message)
  return {
    timestamp: tx.timestamp,
    value,
    networkId: txAddress.networkId,
    hash: tx.hash,
    buttonDisplayDataList: txAddress.paybuttons.map(
      (conn) => {
        return {
          name: conn.paybutton.name,
          id: conn.paybutton.id
        }
      }
    )
  }
}

const getPaymentsByWeek = (addressId: string, payments: Payment[]): KeyValueT<Payment[]> => {
  const paymentsGroupedByKey: KeyValueT<Payment[]> = {}
  for (const payment of payments) {
    const weekKey = getPaymentsWeekKey(addressId, payment.timestamp)
    if (weekKey in paymentsGroupedByKey) {
      paymentsGroupedByKey[weekKey].push(payment)
    } else {
      paymentsGroupedByKey[weekKey] = [payment]
    }
  }
  return paymentsGroupedByKey
}

const getGroupedPaymentsFromAddress = async (address: AddressWithTransactionsWithPrices): Promise<KeyValueT<Payment[]>> => {
  let paymentList: Payment[] = []
  const zero = new Prisma.Decimal(0)
  for (const tx of address.transactions.filter(tx => tx.amount > zero)) {
    const payment = await getPaymentFromTx(tx)
    paymentList.push(payment)
  }
  paymentList = paymentList.filter((p) => p.value > new Prisma.Decimal(0))
  return getPaymentsByWeek(address.id, paymentList)
}

export const getCachedPaymentsForUser = async (userId: string): Promise<Payment[]> => {
  const weekKeys = await getCachedWeekKeysForUser(userId)
  const userButtonIds: string[] = (await fetchPaybuttonArrayByUserId(userId))
    .map(p => p.id)
  let allPayments: Payment[] = []
  for (const weekKey of weekKeys) {
    const paymentsString = await redis.get(weekKey)
    if (paymentsString === null) {
      throw new Error(RESPONSE_MESSAGES.CACHED_PAYMENT_NOT_FOUND_404.message)
    }
    let weekPayments: Payment[] = JSON.parse(paymentsString)
    weekPayments = weekPayments
      .map(pay => {
        pay.buttonDisplayDataList = pay.buttonDisplayDataList.filter(d =>
          userButtonIds.includes(d.id)
        )
        return pay
      })
    allPayments = allPayments.concat(weekPayments)
  }
  return allPayments
}

const cacheGroupedPayments = async (paymentsGroupedByKey: KeyValueT<Payment[]>): Promise<void> => {
  await Promise.all(
    Object.keys(paymentsGroupedByKey).map(async key =>
      await redis.set(key, JSON.stringify(paymentsGroupedByKey[key]))
    )
  )
}

const cacheGroupedPaymentsRemove = async (weekKey: string, hash: string): Promise<void> => {
  const paymentsString = await redis.get(weekKey)
  let cachedPayments: Payment[] = (paymentsString === null) ? [] : JSON.parse(paymentsString)
  cachedPayments = cachedPayments.filter(pay => pay.hash !== hash)
  await redis.set(weekKey, JSON.stringify(cachedPayments))
}

export const uncacheManyTxs = async (txs: TransactionWithAddressAndPrices[]): Promise<void> => {
  for (const tx of txs) {
    const weekKey = getPaymentsWeekKey(tx.address.id, tx.timestamp)
    void await cacheGroupedPaymentsRemove(weekKey, tx.hash)
  }
}

const cacheGroupedPaymentsAppend = async (paymentsGroupedByKey: KeyValueT<Payment[]>): Promise<void> => {
  await Promise.all(
    Object.keys(paymentsGroupedByKey).map(async key => {
      const paymentsString = await redis.get(key)
      let cachedPayments: Payment[] = (paymentsString === null) ? [] : JSON.parse(paymentsString)
      const newHashes = paymentsGroupedByKey[key].map(p => p.hash)
      cachedPayments = cachedPayments
        .filter(p => !newHashes.includes(p.hash))
        .concat(
          paymentsGroupedByKey[key]
        )
      await redis.set(key, JSON.stringify(cachedPayments))
    })
  )
}

export const cacheAddress = async (address: AddressWithTransactionsWithPrices): Promise<void> => {
  const paymentsGroupedByKey = await getGroupedPaymentsFromAddress(address)
  await cacheGroupedPayments(paymentsGroupedByKey)
}

export const cacheManyTxs = async (txs: TransactionWithAddressAndPrices[]): Promise<void> => {
  const zero = new Prisma.Decimal(0)
  for (const tx of txs.filter(tx => tx.amount > zero)) {
    const payment = await getPaymentFromTx(tx)
    if (payment.value !== new Prisma.Decimal(0)) {
      const paymentsGroupedByKey = getPaymentsByWeek(tx.address.id, [payment])
      void await cacheGroupedPaymentsAppend(paymentsGroupedByKey)
    }
  }
}

export const appendPaybuttonToAddressesCache = async (addressIdList: string[], buttonDisplayData: ButtonDisplayData): Promise<void> => {
  for (const id of addressIdList) {
    const keys = await getCachedWeekKeysForAddress(id)
    for (const key of keys) {
      const paymentsString = await redis.get(key)
      const weekPayments: Payment[] = (paymentsString === null) ? [] : JSON.parse(paymentsString)
      weekPayments.forEach((p) =>
        p.buttonDisplayDataList.push(buttonDisplayData)
      )
      await redis.set(key, JSON.stringify(weekPayments))
    }
  }
}

export const clearRecentAddressCache = async (addressString: string, timestamps: number[]): Promise<void> => {
  const weekKeys = timestamps.map(t => getPaymentsWeekKey(addressString, t))
  await Promise.all(
    weekKeys.map(async (k) =>
      await redis.set(k, [])
    )
  )
}
