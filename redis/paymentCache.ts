import { redis } from 'redis/clientInstance'
import { Prisma } from '@prisma/client'
import { getTransactionValue, TransactionWithAddressAndPrices, TransactionWithPrices } from 'services/transactionService'
import { AddressWithTransactionsWithPrices, fetchAllUserAddresses, fetchAddressById, AddressWithPaybuttons, fetchAddressWithTxsAndPrices } from 'services/addressService'
import { fetchPaybuttonArrayByUserId } from 'services/paybuttonService'

import { RESPONSE_MESSAGES, PAYMENT_WEEK_KEY_FORMAT, KeyValueT } from 'constants/index'
import moment from 'moment'
import { CacheSet } from 'redis/index'
import { ButtonDisplayData, Payment } from './types'
import { getUserDashboardData } from './dashboardCache'
// ADDRESS:payments:YYYY:MM
const getPaymentsWeekKey = (addressString: string, timestamp: number): string => {
  return `${addressString}:payments:${moment.unix(timestamp).format(PAYMENT_WEEK_KEY_FORMAT)}`
}

export async function * getUserUncachedAddresses (userId: string): AsyncGenerator<AddressWithTransactionsWithPrices> {
  console.log('getting all addresses...')
  const addresses = await fetchAllUserAddresses(userId, true) as AddressWithTransactionsWithPrices[]
  console.log('got them, will get week keys')
  for (const addr of addresses) {
    const keys = await getCachedWeekKeysForAddress(addr.address)
    if (keys.length === 0) {
      console.log('yielding address', addr.address, 'with all of its txs...')
      yield addr
    }
  }
}

export const getPaymentList = async (userId: string): Promise<Payment[]> => {
  const uncachedAddressStream = getUserUncachedAddresses(userId)
  for await (const address of uncachedAddressStream) {
    console.log('payment list: will create cache for addr', address.address)
    void await CacheSet.addressCreation(address)
  }
  return await getCachedPaymentsForUser(userId)
}

const getCachedWeekKeysForAddress = async (addressString: string): Promise<string[]> => {
  return await redis.keys(`${addressString}:payments:*`)
}

export const getCachedWeekKeysForUser = async (userId: string): Promise<string[]> => {
  console.log('will get addresses strings')
  const addresses = await fetchAllUserAddresses(userId)
  console.log('got addresses strings', addresses.length)
  let ret: string[] = []
  for (const addr of addresses) {
    ret = ret.concat(await getCachedWeekKeysForAddress(addr.address))
  }
  return ret
}

export const generatePaymentFromTx = async (tx: TransactionWithPrices): Promise<Payment> => {
  const values = (await getTransactionValue(tx))
  const txAddress = await fetchAddressById(tx.addressId, true) as AddressWithPaybuttons
  if (txAddress === undefined) throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_FOR_TRANSACTION_404.message)
  return {
    timestamp: tx.timestamp,
    values,
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

const getPaymentsByWeek = (addressString: string, payments: Payment[]): KeyValueT<Payment[]> => {
  const paymentsGroupedByKey: KeyValueT<Payment[]> = {}
  for (const payment of payments) {
    const weekKey = getPaymentsWeekKey(addressString, payment.timestamp)
    if (weekKey in paymentsGroupedByKey) {
      paymentsGroupedByKey[weekKey].push(payment)
    } else {
      paymentsGroupedByKey[weekKey] = [payment]
    }
  }
  return paymentsGroupedByKey
}

export const generateGroupedPaymentsForAddress = async (address: AddressWithTransactionsWithPrices): Promise<KeyValueT<Payment[]>> => {
  let paymentList: Payment[] = []
  const zero = new Prisma.Decimal(0)
  for (const tx of address.transactions.filter(tx => tx.amount > zero)) {
    const payment = await generatePaymentFromTx(tx)
    paymentList.push(payment)
  }
  paymentList = paymentList.filter((p) => p.values.usd > new Prisma.Decimal(0))
  return getPaymentsByWeek(address.address, paymentList)
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

export const getCachedPaymentsCountForUser = async (userId: string): Promise<number> => {
  const dashboardData = await getUserDashboardData(userId)

  return dashboardData.total.payments
}

export const cacheGroupedPayments = async (paymentsGroupedByKey: KeyValueT<Payment[]>): Promise<void> => {
  await Promise.all(
    Object.keys(paymentsGroupedByKey).map(async key =>
      await redis.set(key, JSON.stringify(paymentsGroupedByKey[key]))
    )
  )
}

export const getPaymentsForWeekKey = async (weekKey: string): Promise<Payment[]> => {
  const paymentsString = await redis.get(weekKey)
  return (paymentsString === null) ? [] : JSON.parse(paymentsString)
}

const cacheGroupedPaymentsRemove = async (weekKey: string, hash: string): Promise<void> => {
  const paymentsString = await redis.get(weekKey)
  let cachedPayments: Payment[] = (paymentsString === null) ? [] : JSON.parse(paymentsString)
  cachedPayments = cachedPayments.filter(pay => pay.hash !== hash)
  await redis.set(weekKey, JSON.stringify(cachedPayments))
}

export const uncacheManyTxs = async (txs: TransactionWithAddressAndPrices[]): Promise<void> => {
  for (const tx of txs) {
    const weekKey = getPaymentsWeekKey(tx.address.address, tx.timestamp)
    void await cacheGroupedPaymentsRemove(weekKey, tx.hash)
  }
}

const cacheGroupedPaymentsAppend = async (paymentsGroupedByKey: KeyValueT<Payment[]>): Promise<void> => {
  await Promise.all(
    Object.keys(paymentsGroupedByKey).map(async key => {
      const paymentsString = await redis.get(key)
      let cachedPayments: Payment[] = (paymentsString === null) ? [] : JSON.parse(paymentsString)
      const hashes = paymentsGroupedByKey[key].map(p => p.hash)
      cachedPayments = cachedPayments
        .filter(p => !hashes.includes(p.hash))
        .concat(
          paymentsGroupedByKey[key]
        )
      await redis.set(key, JSON.stringify(cachedPayments))
    })
  )
}

export const cacheManyTxs = async (txs: TransactionWithAddressAndPrices[]): Promise<void> => {
  const zero = new Prisma.Decimal(0)
  for (const tx of txs.filter(tx => tx.amount > zero)) {
    const payment = await generatePaymentFromTx(tx)
    if (payment.values.usd !== new Prisma.Decimal(0)) {
      const paymentsGroupedByKey = getPaymentsByWeek(tx.address.address, [payment])
      void await cacheGroupedPaymentsAppend(paymentsGroupedByKey)
    }
  }
}

export const removePaybuttonToAddressesCache = async (addressStringList: string[], buttonId: string): Promise<void> => {
  for (const addressString of addressStringList) {
    const keys = await getCachedWeekKeysForAddress(addressString)
    for (const key of keys) {
      const paymentsString = await redis.get(key)
      const weekPayments: Payment[] = (paymentsString === null) ? [] : JSON.parse(paymentsString)
      weekPayments.forEach((p) => {
        p.buttonDisplayDataList = p.buttonDisplayDataList.filter(dd => dd.id !== buttonId)
      })
      await redis.set(key, JSON.stringify(weekPayments))
    }
  }
}

export const appendPaybuttonToAddressesCache = async (addressStringList: string[], buttonDisplayData: ButtonDisplayData): Promise<void> => {
  for (const addressString of addressStringList) {
    const keys = await getCachedWeekKeysForAddress(addressString)
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
      await redis.del(k, () => {})
    )
  )
}

export const initPaymentCache = async (addressString: string): Promise<boolean> => {
  const cachedKeys = await getCachedWeekKeysForAddress(addressString)
  if (cachedKeys.length === 0) {
    const address = await fetchAddressWithTxsAndPrices(addressString)
    await CacheSet.addressCreation(address)
    return true
  }
  return false
}

export async function * getPaymentStream (userId: string): AsyncGenerator<Payment> {
  console.log('getting payment stream')
  const uncachedAddressStream = getUserUncachedAddresses(userId)
  for await (const address of uncachedAddressStream) {
    console.log('payment stream: will create cache for addr', address.address)
    await CacheSet.addressCreation(address)
  }
  console.log('CREATED CACHE!')
  const weekKeys = await getCachedWeekKeysForUser(userId)

  console.log('will now yield payments')
  let i = 0
  for (const weekKey of weekKeys) {
    if (i % 100 === 0) console.log('yielding payment number', i)
    i++
    const paymentsString = await redis.get(weekKey)

    if (paymentsString !== null) {
      const weekPayments: Payment[] = JSON.parse(paymentsString)

      for (const payment of weekPayments) {
        yield payment // Yield one payment at a time
      }
    }
  }
}
