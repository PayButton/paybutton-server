import { redis } from 'redis/clientInstance'
import { Address, Prisma } from '@prisma/client'
import { generateTransactionsWithPaybuttonsAndPricesForAddress, getTransactionValue, TransactionsWithPaybuttonsAndPrices, TransactionWithAddressAndPrices } from 'services/transactionService'
import { fetchAllUserAddresses, AddressPaymentInfo } from 'services/addressService'
import { fetchPaybuttonArrayByUserId } from 'services/paybuttonService'

import { RESPONSE_MESSAGES, PAYMENT_WEEK_KEY_FORMAT, KeyValueT } from 'constants/index'
import moment from 'moment-timezone'
import { CacheSet } from 'redis/index'
import { ButtonDisplayData, Payment } from './types'
import { getUserDashboardData } from './dashboardCache'
// ADDRESS:payments:YYYY:MM
const getPaymentsWeekKey = (addressString: string, timestamp: number): string => {
  return `${addressString}:payments:${moment.unix(timestamp).format(PAYMENT_WEEK_KEY_FORMAT)}`
}

export async function * getUserUncachedAddresses (userId: string): AsyncGenerator<Address> {
  const addresses = await fetchAllUserAddresses(userId, false, false) as Address[]
  for (const address of addresses) {
    const keys = await getCachedWeekKeysForAddress(address.address)
    if (keys.length === 0) {
      yield address
    }
  }
}

export const getPaymentList = async (userId: string): Promise<Payment[]> => {
  const uncachedAddressStream = getUserUncachedAddresses(userId)
  for await (const address of uncachedAddressStream) {
    void await CacheSet.addressCreation(address)
  }
  return await getCachedPaymentsForUser(userId)
}

const getCachedWeekKeysForAddress = async (addressString: string): Promise<string[]> => {
  return await redis.keys(`${addressString}:payments:*`)
}

export const getCachedWeekKeysForUser = async (userId: string): Promise<string[]> => {
  const addresses = await fetchAllUserAddresses(userId)
  let ret: string[] = []
  for (const addr of addresses) {
    ret = ret.concat(await getCachedWeekKeysForAddress(addr.address))
  }
  return ret
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

interface GroupedPaymentsAndInfoObject {
  groupedPayments: KeyValueT<Payment[]>
  info: AddressPaymentInfo
}

export const generatePaymentFromTx = async (tx: TransactionsWithPaybuttonsAndPrices): Promise<Payment> => {
  const values = getTransactionValue(tx)
  let buttonDisplayDataList: Array<{ name: string, id: string}> = []
  if (tx.address.paybuttons !== undefined) {
    buttonDisplayDataList = tx.address.paybuttons.map(
      (conn) => {
        return {
          name: conn.paybutton.name,
          id: conn.paybutton.id,
          providerUserId: conn.paybutton.providerUserId
        }
      }
    )
  } else {
    console.warn('Orphan address:', tx.address.address)
  }
  return {
    timestamp: tx.timestamp,
    values: {
      values,
      amount: tx.amount,
      networkId: tx.address.networkId
    },
    amount: {
      amount: tx.amount,
      networkId: tx.address.networkId
    },
    networkId: tx.address.networkId,
    hash: tx.hash,
    buttonDisplayDataList,
    address: tx.address.address
  }
}

export const generateAndCacheGroupedPaymentsAndInfoForAddress = async (address: Address): Promise<GroupedPaymentsAndInfoObject> => {
  let paymentList: Payment[] = []
  let balance = new Prisma.Decimal(0)
  let paymentCount = 0
  const txsWithPaybuttonsGenerator = generateTransactionsWithPaybuttonsAndPricesForAddress(address.id)
  for await (const batch of txsWithPaybuttonsGenerator) {
    for (const tx of batch) {
      balance = balance.plus(tx.amount)
      if (tx.amount.gt(0)) {
        const payment = await generatePaymentFromTx(tx)
        paymentList.push(payment)
        paymentCount++
      }
    }
  }
  const info: AddressPaymentInfo = {
    balance,
    paymentCount
  }

  paymentList = paymentList.filter((p) => p.values.values.usd > new Prisma.Decimal(0))
  const groupedPayments = getPaymentsByWeek(address.address, paymentList)
  return {
    groupedPayments,
    info
  }
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

export const getCachedPaymentsCountForUser = async (userId: string, timezone: string): Promise<number> => {
  const dashboardData = await getUserDashboardData(userId, timezone)

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

export const cacheManyTxs = async (txs: TransactionsWithPaybuttonsAndPrices[]): Promise<void> => {
  const zero = new Prisma.Decimal(0)
  for (const tx of txs.filter(tx => tx.amount > zero)) {
    const payment = await generatePaymentFromTx(tx)
    if (payment.values.values.usd !== new Prisma.Decimal(0)) {
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

export const initPaymentCache = async (address: Address): Promise<boolean> => {
  const cachedKeys = await getCachedWeekKeysForAddress(address.address)
  if (cachedKeys.length === 0) {
    await CacheSet.addressCreation(address)
    return true
  }
  return false
}

export async function * getPaymentStream (userId: string): AsyncGenerator<Payment> {
  const uncachedAddressStream = getUserUncachedAddresses(userId)
  for await (const address of uncachedAddressStream) {
    console.log('[CACHE]: Creating cache for address', address.address)
    await CacheSet.addressCreation(address)
  }
  const userButtonIds: string[] = (await fetchPaybuttonArrayByUserId(userId))
    .map(p => p.id)
  const weekKeys = await getCachedWeekKeysForUser(userId)

  for (const weekKey of weekKeys) {
    const paymentsString = await redis.get(weekKey)

    if (paymentsString !== null) {
      let weekPayments: Payment[] = JSON.parse(paymentsString)
      weekPayments = weekPayments
        .map(pay => {
          pay.buttonDisplayDataList = pay.buttonDisplayDataList.filter(d =>
            userButtonIds.includes(d.id)
          )
          return pay
        })

      for (const payment of weekPayments) {
        yield payment // Yield one payment at a time
      }
    }
  }
}
