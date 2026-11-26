import { redis } from 'redis/clientInstance'
import { Address, Prisma } from '@prisma/client'
import {
  fetchTxTimestampRangesByAddressId,
  generateTransactionsWithPaybuttonsAndPricesForAddress,
  getTransactionValue,
  TransactionsWithPaybuttonsAndPrices,
  TransactionWithAddressAndPrices,
  TransactionWithAddressAndPricesAndInvoices
} from 'services/transactionService'
import { fetchAllUserAddresses, AddressPaymentInfo } from 'services/addressService'
import { fetchPaybuttonArrayByUserId } from 'services/paybuttonService'
import { QuoteValues } from 'services/priceService'

import { PAYMENT_WEEK_KEY_FORMAT, KeyValueT, N_OF_QUOTES, CACHE_EXISTS_BATCH_SIZE, CACHE_MGET_BATCH_SIZE } from 'constants/index'
import moment from 'moment-timezone'
import { CacheSet, dropCachesBuiltWithoutAddressTxs, isAddressRebuildBackedOff } from 'redis/index'
import { beginCacheClear, bumpCacheGeneration, endCacheClear, getCacheBuiltKey } from './cacheGeneration'
import { ButtonDisplayData, Payment } from './types'
import { getUserDashboardData, clearDashboardCache } from './dashboardCache'
// ADDRESS:payments:YYYY:MM
const getPaymentsWeekKey = (addressString: string, timestamp: number): string => {
  return `${addressString}:payments:${moment.unix(timestamp).format(PAYMENT_WEEK_KEY_FORMAT)}`
}

interface AddressCacheState {
  address: Address
  // Whether a full rebuild wrote the address's payment cache (see getCacheBuiltKey).
  built: boolean
  // The address's week keys present in the cache.
  weekKeys: string[]
}

interface DaySpan {
  start: number
  end: number
  weekSuffix: string
}

/**
 * Each local day from `from` to `to` (unix seconds), with the suffix that
 * getPaymentsWeekKey gives the payments timestamped on it.
 */
const getDaySpans = (from: number, to: number): DaySpan[] => {
  const spans: DaySpan[] = []
  const last = moment.unix(to)
  let day = moment.unix(from).startOf('day')
  while (day.isSameOrBefore(last)) {
    const next = day.clone().add(1, 'day')
    spans.push({ start: day.unix(), end: next.unix() - 1, weekSuffix: day.format(PAYMENT_WEEK_KEY_FORMAT) })
    day = next
  }
  return spans
}

/** For each key, whether it exists, batching the checks into pipelines. */
const getKeysExist = async (keys: string[]): Promise<boolean[]> => {
  const exist: boolean[] = []
  for (let i = 0; i < keys.length; i += CACHE_EXISTS_BATCH_SIZE) {
    const batch = keys.slice(i, i + CACHE_EXISTS_BATCH_SIZE)
    const results: Array<[Error | null, unknown]> = (await redis.pipeline(batch.map(k => ['exists', k])).exec()) ?? []
    for (const [err, count] of results) {
      if (err !== null) throw err
      exist.push(Number(count) === 1)
    }
  }
  return exist
}

/**
 * The payment cache state of each of the user's addresses. Week keys are named
 * after their week, so instead of SCANning the whole keyspace (twice, per
 * address) for them, this derives the weeks each address can have payments in
 * from its oldest and newest tx, and checks which of those keys exist.
 */
const getUserAddressCacheStates = async (userId: string): Promise<AddressCacheState[]> => {
  const addresses = await fetchAllUserAddresses(userId) as Address[]
  if (addresses.length === 0) return []
  const ranges = await fetchTxTimestampRangesByAddressId(addresses.map(a => a.id))
  // Up to now at least: a tx arriving after the ranges were read may already be cached.
  const now = moment().unix()
  let from = now
  let to = now
  for (const range of ranges.values()) {
    from = Math.min(from, range.min)
    to = Math.max(to, range.max)
  }
  const daySpans = getDaySpans(from, to)

  const candidateKeysByAddress = addresses.map(address => {
    const range = ranges.get(address.id)
    if (range === undefined) return []
    const suffixes = new Set<string>()
    for (const span of daySpans) {
      if (span.end >= range.min && span.start <= Math.max(range.max, now)) {
        suffixes.add(span.weekSuffix)
      }
    }
    return [...suffixes].map(suffix => `${address.address}:payments:${suffix}`)
  })
  const keysToCheck = addresses.flatMap((address, i) => [getCacheBuiltKey(address.address), ...candidateKeysByAddress[i]])
  const exist = await getKeysExist(keysToCheck)

  let pos = 0
  return addresses.map((address, i) => {
    const built = exist[pos++]
    const weekKeys = candidateKeysByAddress[i].filter(() => exist[pos++])
    return { address, built, weekKeys }
  })
}

/**
 * Whether the address's payment cache has been written. Caches written before
 * the built marker existed are recognized by their week keys.
 */
const isAddressCached = (state: AddressCacheState): boolean => state.built || state.weekKeys.length > 0

const triggerBackgroundRebuildIfNeeded = (userId: string, states: AddressCacheState[]): void => {
  if (process.env.SKIP_CACHE_REBUILD !== undefined) return
  const uncachedAddresses = states.filter(s => !isAddressCached(s)).map(s => s.address)
  if (uncachedAddresses.length > 0) {
    if (!isBackgroundRebuildActive(userId)) {
      console.log(`[CACHE] ${uncachedAddresses.length} uncached addresses for user ${userId}, starting background rebuild`)
    }
    void cacheAddressesInBackground(uncachedAddresses, userId)
  }
}

/** Yields the payments stored under the given week keys, fetching them in MGET batches. */
async function * getPaymentsForWeekKeys (weekKeys: string[], userButtonIds: string[]): AsyncGenerator<Payment> {
  const userButtonIdSet = new Set(userButtonIds)
  for (let i = 0; i < weekKeys.length; i += CACHE_MGET_BATCH_SIZE) {
    const values = await redis.mget(weekKeys.slice(i, i + CACHE_MGET_BATCH_SIZE))
    for (const paymentsString of values) {
      // Deleted since its existence was checked, e.g. by a cache clear.
      if (paymentsString === null) continue
      const weekPayments: Payment[] = JSON.parse(paymentsString)
      for (const payment of weekPayments) {
        payment.buttonDisplayDataList = payment.buttonDisplayDataList.filter(d => userButtonIdSet.has(d.id))
        yield payment
      }
    }
  }
}

export const getPaymentList = async (userId: string): Promise<Payment[]> => {
  const payments: Payment[] = []
  for await (const payment of getPaymentStream(userId)) {
    payments.push(payment)
  }
  return payments
}

const getCachedWeekKeysForAddress = async (addressString: string): Promise<string[]> => {
  const pattern = `${addressString}:payments:*`
  const keys: string[] = []
  const stream = redis.scanStream({
    match: pattern,
    count: 100
  })
  return await new Promise<string[]>((resolve, reject) => {
    stream.on('data', (batch: string[]) => {
      keys.push(...batch)
    })
    stream.on('end', () => resolve(keys))
    stream.on('error', reject)
  })
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

export const generatePaymentFromTx = (tx: TransactionsWithPaybuttonsAndPrices): Payment => {
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
    id: tx.id,
    timestamp: tx.timestamp,
    values,
    amount: tx.amount,
    networkId: tx.address.networkId,
    hash: tx.hash,
    buttonDisplayDataList,
    address: tx.address.address
  }
}

export const generatePaymentFromTxWithInvoices = (tx: TransactionWithAddressAndPricesAndInvoices, userId?: string): Payment => {
  // Txs can be left without price links when price data is missing for their
  // timestamp (see connectTransactionsListToPrices); connectAllTransactionsToPrices
  // retries them later. Don't fail the whole payments listing over one of them.
  let values: QuoteValues
  if (tx.prices.length !== N_OF_QUOTES) {
    console.warn(`[PAYMENTS] tx ${tx.hash} has missing price links (${tx.prices.length}/${N_OF_QUOTES}), using zero fiat values`)
    values = { usd: new Prisma.Decimal(0), cad: new Prisma.Decimal(0) }
  } else {
    values = getTransactionValue(tx)
  }
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
  let invoices = null
  if (tx.invoices.length > 0) {
    invoices = tx.invoices.filter(invoice => {
      return invoice !== null && invoice.userId === userId
    })
  }
  return {
    id: tx.id,
    timestamp: tx.timestamp,
    values,
    amount: tx.amount,
    networkId: tx.address.networkId,
    hash: tx.hash,
    buttonDisplayDataList,
    address: tx.address.address,
    invoices: invoices ?? []
  }
}

export const generateAndCacheGroupedPaymentsAndInfoForAddress = async (address: Address): Promise<GroupedPaymentsAndInfoObject> => {
  const startTime = Date.now()
  let paymentList: Payment[] = []
  let balance = new Prisma.Decimal(0)
  let paymentCount = 0
  let txCount = 0
  let skippedUnpriced = 0
  const txsWithPaybuttonsGenerator = generateTransactionsWithPaybuttonsAndPricesForAddress(address.id)
  for await (const batch of txsWithPaybuttonsGenerator) {
    for (const tx of batch) {
      txCount++
      balance = balance.plus(tx.amount)
      if (tx.amount.gt(0)) {
        // Left out until its prices are linked; connectAllTransactionsToPrices
        // then invalidates this address so it is rebuilt with the tx.
        if (tx.prices.length !== N_OF_QUOTES) {
          skippedUnpriced++
          continue
        }
        const payment = generatePaymentFromTx(tx)
        paymentList.push(payment)
        paymentCount++
      }
    }
    // Throttle batch processing slightly so long cache rebuilds don't monopolize DB resources.
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[CACHE] Cached address ${address.address.slice(0, 20)}...: ${paymentCount} payments, ${txCount} txs in ${elapsed}s`)
  if (skippedUnpriced > 0) {
    console.warn(`[CACHE] Address ${address.address}: left out ${skippedUnpriced} payments with missing price links.`)
  }
  const info: AddressPaymentInfo = {
    balance,
    paymentCount
  }

  paymentList = paymentList.filter((p) => p.values.usd > new Prisma.Decimal(0))
  const groupedPayments = getPaymentsByWeek(address.address, paymentList)
  return {
    groupedPayments,
    info
  }
}

export const getCachedPaymentsCountForUser = async (userId: string, timezone: string): Promise<number> => {
  const dashboardData = await getUserDashboardData(userId, timezone)

  return dashboardData.total.payments
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
    const payment = generatePaymentFromTx(tx)
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

/** Remove all week-grouped payment keys for an address (forces rebuild from DB). */
export const clearPaymentCacheForAddress = async (addressString: string): Promise<void> => {
  // Bumped even when nothing is cached yet: that is exactly when a rebuild may be
  // in flight, and it must not publish what it read before this invalidation.
  // Marked as in progress first, so no rebuild write can land between deleting
  // the marker and deleting the week keys (see beginCacheClear).
  await beginCacheClear(addressString)
  try {
    await bumpCacheGeneration(addressString)
    await redis.del(getCacheBuiltKey(addressString), () => {})
    const weekKeys = await getCachedWeekKeysForAddress(addressString)
    await Promise.all(
      weekKeys.map(async (key) => await redis.del(key, () => {}))
    )
  } finally {
    await endCacheClear(addressString)
  }
}

/**
 * If the address has no payment cache, starts rebuilding it in the background
 * and returns true: the rebuild reads the address's txs from the DB, so the
 * caller has nothing to add incrementally. It doesn't wait for the rebuild,
 * which can take minutes for a large address and must not hold up tx handling.
 */
export const initPaymentCache = async (address: Address): Promise<boolean> => {
  if (process.env.SKIP_CACHE_REBUILD !== undefined) return false
  const cachedKeys = await getCachedWeekKeysForAddress(address.address)
  if (cachedKeys.length === 0) {
    if (isAddressRebuildBackedOff(address.address)) {
      // Its last rebuild failed recently, so none starts now. The tx isn't added
      // as a lone week (that would pass for a complete cache), but the balance
      // and dashboards built without it are dropped.
      await dropCachesBuiltWithoutAddressTxs(address.address)
      return true
    }
    void CacheSet.addressCreation(address).catch((err: any) => {
      console.error(`[CACHE] Failed to rebuild ${address.address}: ${String(err?.message ?? err)}`)
    })
    return true
  }
  return false
}

/**
 * The payment a tx contributes to its address's cache, or undefined if a rebuild
 * would leave it out (not incoming, prices not linked yet, or no USD value).
 */
const cacheablePaymentFromTx = (tx: TransactionsWithPaybuttonsAndPrices): Payment | undefined => {
  if (!new Prisma.Decimal(tx.amount).gt(0)) return undefined
  if (tx.prices.length !== N_OF_QUOTES) return undefined
  const payment = generatePaymentFromTx(tx)
  if (!new Prisma.Decimal(payment.values.usd).gt(0)) return undefined
  return payment
}

/**
 * Week-key entries of the address's payment cache with these txs replaced by
 * their current version (or dropped, if a rebuild would now leave them out).
 * Reads the current weeks but writes nothing: the caller writes the entries.
 * A tx whose timestamp moved to another week is not removed from its old week.
 */
export const getPatchedWeekEntries = async (
  addressString: string,
  txs: TransactionsWithPaybuttonsAndPrices[]
): Promise<Array<[key: string, value: string]>> => {
  const txsByWeekKey = new Map<string, TransactionsWithPaybuttonsAndPrices[]>()
  for (const tx of txs) {
    const key = getPaymentsWeekKey(addressString, tx.timestamp)
    txsByWeekKey.set(key, [...(txsByWeekKey.get(key) ?? []), tx])
  }
  const entries: Array<[string, string]> = []
  for (const [key, weekTxs] of txsByWeekKey) {
    const current: Payment[] = JSON.parse((await redis.get(key)) ?? '[]')
    const hashes = new Set(weekTxs.map(t => t.hash))
    const updated = weekTxs
      .map(cacheablePaymentFromTx)
      .filter((p): p is Payment => p !== undefined)
    entries.push([key, JSON.stringify(current.filter(p => !hashes.has(p.hash)).concat(updated))])
  }
  return entries
}

const activeBackgroundRebuilds = new Set<string>()

export const isBackgroundRebuildActive = (userId: string): boolean => {
  return activeBackgroundRebuilds.has(userId)
}

const cacheAddressesInBackground = async (addresses: Address[], userId: string): Promise<void> => {
  if (activeBackgroundRebuilds.has(userId)) {
    console.log(`[CACHE] Background: already running for user ${userId}, skipping`)
    return
  }
  activeBackgroundRebuilds.add(userId)
  const startTime = Date.now()
  let cached = 0
  try {
    for (const address of addresses) {
      try {
        // Shares a rebuild already running for the address; false if skipped
        // because its last rebuild failed recently.
        if (!(await CacheSet.addressCreation(address))) continue
        cached++
        if (cached % 10 === 0 || cached === addresses.length) {
          console.log(`[CACHE] Background: cached ${cached}/${addresses.length} addresses for user ${userId}`)
        }
      } catch (err: any) {
        console.error(`[CACHE] Background: failed to cache ${address.address.slice(0, 20)}...: ${String(err.message ?? err)}`)
      }
    }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[CACHE] Background: completed ${cached}/${addresses.length} addresses for user ${userId} in ${elapsed}s`)
    await clearDashboardCache(userId)
  } finally {
    activeBackgroundRebuilds.delete(userId)
  }
}

/**
 * Yields the user's cached payments, starting a background rebuild of any of
 * their addresses that aren't cached yet (whose payments are left out).
 */
export async function * getPaymentStream (userId: string): AsyncGenerator<Payment> {
  const states = await getUserAddressCacheStates(userId)
  triggerBackgroundRebuildIfNeeded(userId, states)

  const userButtonIds: string[] = (await fetchPaybuttonArrayByUserId(userId))
    .map(p => p.id)
  yield * getPaymentsForWeekKeys(states.flatMap(s => s.weekKeys), userButtonIds)
}
