import axios from 'axios'
import { Prisma, Price } from '@prisma/client'
import config from 'config'
import prisma from 'prisma-local/clientInstance'
import { PRICE_API_TIMEOUT, PRICE_API_MAX_RETRIES, PRICE_API_DATE_FORMAT, RESPONSE_MESSAGES, NETWORK_TICKERS, XEC_NETWORK_ID, BCH_NETWORK_ID, USD_QUOTE_ID, CAD_QUOTE_ID, N_OF_QUOTES, N_DAYS_LOOK_FOR_PRICE_GAPS } from 'constants/index'
import { validatePriceAPIUrlAndToken, validateNetworkTicker } from 'utils/validators'
import moment from 'moment'

export function flattenTimestamp (timestamp: number): number {
  const date = moment.utc(timestamp * 1000)
  const dateStart = date.startOf('day')
  return dateStart.unix()
}

// price data comes as string
interface IResponseData {
  Price_in_CAD: string
  Price_in_USD: string
}

export interface AllPrices {
  cad: Price
  usd: Price
}

interface IResponseDataDaily extends IResponseData {
  day: string
}

export async function upsertPricesForNetworkId (responseData: IResponseData, networkId: number, timestamp: number): Promise<void> {
  try {
    await prisma.price.upsert({
      where: {
        Price_timestamp_quoteId_networkId_unique_constraint: {
          quoteId: USD_QUOTE_ID,
          networkId,
          timestamp
        }
      },
      create: {
        quoteId: USD_QUOTE_ID,
        networkId,
        timestamp,
        value: new Prisma.Decimal(responseData.Price_in_USD)
      },
      update: {
        value: new Prisma.Decimal(responseData.Price_in_USD)
      }
    })

    await prisma.price.upsert({
      where: {
        Price_timestamp_quoteId_networkId_unique_constraint: {
          quoteId: CAD_QUOTE_ID,
          networkId,
          timestamp
        }
      },
      create: {
        quoteId: CAD_QUOTE_ID,
        networkId,
        timestamp,
        value: new Prisma.Decimal(responseData.Price_in_CAD)
      },
      update: {
        value: new Prisma.Decimal(responseData.Price_in_CAD)
      }
    })
  } catch (error) {
    console.error(`Problem inserting current price for ${networkId} at timestamp ${timestamp} using data`, responseData, `:\n${error as string}`)
    throw error
  }
}

export async function upsertCurrentPricesForNetworkId (responseData: IResponseData, networkId: number): Promise<void> {
  await upsertPricesForNetworkId(responseData, networkId, 0)
  const todaysTimestamp = flattenTimestamp(moment().unix())
  await upsertPricesForNetworkId(responseData, networkId, todaysTimestamp)
}

function getPriceURLForDayAndNetworkTicker (day: moment.Moment, networkTicker: string): string {
  validatePriceAPIUrlAndToken()
  validateNetworkTicker(networkTicker)
  return `${config.priceAPIURL}/pricebydate/${process.env.PRICE_API_TOKEN!}/${networkTicker}+${day.format(PRICE_API_DATE_FORMAT)}`
}

function getAllPricesURLForNetworkTicker (networkTicker: string): string {
  validatePriceAPIUrlAndToken()
  validateNetworkTicker(networkTicker)
  return `${config.priceAPIURL}/dailyprices/${process.env.PRICE_API_TOKEN!}/${networkTicker}`
}

async function withRetries<T> (
  fn: () => Promise<T>,
  { maxRetries = PRICE_API_MAX_RETRIES, throwOnFailure = true, context = {} } = {}
): Promise<T | null> {
  let lastError: any
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      console.error(`[Retry ${attempt}/${maxRetries}] ${String(error)}`, { ...context })
      if (attempt < maxRetries) continue
      if (throwOnFailure) throw lastError
      console.error(`[Retry ${attempt}/${maxRetries}] skipping error:`)
      console.error(String(lastError))
      return null
    }
  }
  return null
}

export async function getPriceForDayAndNetworkTicker (day: moment.Moment, networkTicker: string): Promise<IResponseData> {
  return await withRetries(async () => {
    const res = await axios.get(getPriceURLForDayAndNetworkTicker(day, networkTicker), { timeout: PRICE_API_TIMEOUT })
    if (res.data.success !== false && isResponseAsExpected(res.data)) return res.data
    throw new Error(RESPONSE_MESSAGES.FAILED_TO_FETCH_PRICE_FROM_API_500(day.format(PRICE_API_DATE_FORMAT), networkTicker).message)
  }, { context: { day } })
}

function isResponseAsExpected (data: any): boolean {
  const isExpectedObj = data?.Price_in_CAD !== undefined && data?.Price_in_USD !== undefined
  if (isExpectedObj) return true
  const values = Object.values(data ?? {})
  if (values.length > 0) {
    const first = values[0] as any
    return first?.Price_in_CAD !== undefined && first?.Price_in_USD !== undefined
  }
  return false
}

export async function getAllPricesByNetworkTicker (
  networkTicker: string,
  throwOnFailure: true
): Promise<IResponseDataDaily[]>

export async function getAllPricesByNetworkTicker (
  networkTicker: string,
  throwOnFailure: false
): Promise<IResponseDataDaily[] | null>

export async function getAllPricesByNetworkTicker (
  networkTicker: string,
  throwOnFailure = true
): Promise<IResponseDataDaily[] | null> {
  return await withRetries(async () => {
    const res = await axios.get(getAllPricesURLForNetworkTicker(networkTicker), { timeout: PRICE_API_TIMEOUT })
    if (res.data.success !== false && isResponseAsExpected(res.data)) {
      return Object.entries<IResponseData>(res.data).map(([day, priceData]) => ({ day, ...priceData }))
    }
    throw new Error(RESPONSE_MESSAGES.FAILED_TO_FETCH_PRICE_FROM_API_500('ALL_DAYS', networkTicker).message)
  }, { throwOnFailure })
}

export async function syncPastDaysNewerPrices (): Promise<void> {
  console.log(`[PRICES] Syncing missing prices, including gaps on the last ${N_DAYS_LOOK_FOR_PRICE_GAPS} days...`)

  const today = moment.utc().startOf('day')
  const windowStart = moment.utc().subtract(N_DAYS_LOOK_FOR_PRICE_GAPS, 'days').startOf('day')

  const existingPrices = await prisma.price.findMany({
    where: {
      timestamp: {
        gte: windowStart.unix(),
        lte: today.unix()
      },
      quoteId: USD_QUOTE_ID
    },
    select: { timestamp: true, networkId: true }
  })

  const xecTimestamps = new Set(
    existingPrices.filter(p => p.networkId === XEC_NETWORK_ID).map(p => p.timestamp)
  )
  const bchTimestamps = new Set(
    existingPrices.filter(p => p.networkId === BCH_NETWORK_ID).map(p => p.timestamp)
  )

  const expectedDays: Array<{ formatted: string, timestamp: number }> = []
  const cursor = today.clone()
  while (cursor.isSameOrAfter(windowStart)) {
    expectedDays.push({ formatted: cursor.format(PRICE_API_DATE_FORMAT), timestamp: cursor.unix() })
    cursor.subtract(1, 'day')
  }

  const missingXECDays = expectedDays.filter(d => !xecTimestamps.has(d.timestamp))
  const missingBCHDays = expectedDays.filter(d => !bchTimestamps.has(d.timestamp))

  const totalMissing = missingXECDays.length + missingBCHDays.length
  if (totalMissing === 0) {
    console.log(`[PRICES] No missing prices found in the last ${N_DAYS_LOOK_FOR_PRICE_GAPS} days.`)
    return
  }

  console.log(`[PRICES] Found ${missingXECDays.length} missing XEC days and ${missingBCHDays.length} missing BCH days. Fetching from API...`)

  const allXECPrices = missingXECDays.length > 0 ? await getAllPricesByNetworkTicker(NETWORK_TICKERS.ecash, false) : null
  const allBCHPrices = missingBCHDays.length > 0 ? await getAllPricesByNetworkTicker(NETWORK_TICKERS.bitcoincash, false) : null

  if (allXECPrices !== null) {
    const missingDaySet = new Set(missingXECDays.map(d => d.formatted))
    await Promise.all(
      allXECPrices
        .filter(p => missingDaySet.has(p.day))
        .map(async price => await upsertPricesForNetworkId(price, XEC_NETWORK_ID, moment.utc(price.day).unix()))
    )
  }

  if (allBCHPrices !== null) {
    const missingDaySet = new Set(missingBCHDays.map(d => d.formatted))
    await Promise.all(
      allBCHPrices
        .filter(p => missingDaySet.has(p.day))
        .map(async price => await upsertPricesForNetworkId(price, BCH_NETWORK_ID, moment.utc(price.day).unix()))
    )
  }

  console.log('[PRICES] All missing prices have been synced.')
}

export async function syncCurrentPrices (): Promise<void> {
  const today = moment()
  const bchPrice = await getPriceForDayAndNetworkTicker(today, NETWORK_TICKERS.bitcoincash)
  void upsertCurrentPricesForNetworkId(bchPrice, BCH_NETWORK_ID)

  const xecPrice = await getPriceForDayAndNetworkTicker(today, NETWORK_TICKERS.ecash)
  void upsertCurrentPricesForNetworkId(xecPrice, XEC_NETWORK_ID)
}

export async function getCurrentPrices (): Promise<Price[]> {
  return await prisma.price.findMany({
    where: { timestamp: 0 }
  })
}

export async function getCurrentPricesForNetworkId (networkId: number): Promise<QuoteValues> {
  const currentPrices = await prisma.price.findMany({
    where: { timestamp: 0, networkId }
  })
  if (currentPrices.length !== N_OF_QUOTES) {
    throw new Error(RESPONSE_MESSAGES.NO_CURRENT_PRICES_FOUND_404.message)
  }
  return {
    usd: currentPrices.filter(p => p.quoteId === USD_QUOTE_ID)[0].value,
    cad: currentPrices.filter(p => p.quoteId === CAD_QUOTE_ID)[0].value
  }
}

export interface QuoteValues {
  usd: Prisma.Decimal
  cad: Prisma.Decimal
}

export interface CreatePricesFromTransactionInput {
  timestamp: number
  networkId: number
  transactionId: string
  values?: QuoteValues
}

export interface SyncTransactionPricesInput {
  networkId: number
  timestamp: number
  transactionId: string
}

export async function fetchPricesForNetworkAndTimestamp (
  networkId: number,
  timestamp: number,
  prismaTx: Prisma.TransactionClient,
  tryRenewing = true
): Promise<AllPrices> {
  const getPrices = async (firstRun = true): Promise<AllPrices> => {
    const flattenedTimestamp = flattenTimestamp(timestamp)
    try {
      const cad = await prismaTx.price.findUniqueOrThrow({
        where: { Price_timestamp_quoteId_networkId_unique_constraint: { quoteId: CAD_QUOTE_ID, networkId, timestamp: flattenedTimestamp } }
      })
      const usd = await prismaTx.price.findUniqueOrThrow({
        where: { Price_timestamp_quoteId_networkId_unique_constraint: { quoteId: USD_QUOTE_ID, networkId, timestamp: flattenedTimestamp } }
      })
      return { cad, usd }
    } catch (err) {
      if (tryRenewing && firstRun) {
        const ok = await renewPricesForTimestamp(flattenedTimestamp)
        if (ok) return await getPrices(false)
      }
      throw err
    }
  }
  return await getPrices()
}

async function renewPricesForTimestamp (timestamp: number): Promise<boolean> {
  try {
    const xecPrice = await getPriceForDayAndNetworkTicker(moment(timestamp * 1000), NETWORK_TICKERS.ecash)
    await upsertPricesForNetworkId(xecPrice, XEC_NETWORK_ID, timestamp)

    const bchPrice = await getPriceForDayAndNetworkTicker(moment(timestamp * 1000), NETWORK_TICKERS.bitcoincash)
    await upsertPricesForNetworkId(bchPrice, BCH_NETWORK_ID, timestamp)

    return true
  } catch {
    return false
  }
}
