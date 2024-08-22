import axios from 'axios'
import { Prisma, Price } from '@prisma/client'
import config from 'config'
import prisma from 'prisma/clientInstance'
import { HUMAN_READABLE_DATE_FORMAT, PRICE_API_TIMEOUT, PRICE_API_MAX_RETRIES, PRICE_API_DATE_FORMAT, RESPONSE_MESSAGES, NETWORK_TICKERS, XEC_NETWORK_ID, BCH_NETWORK_ID, USD_QUOTE_ID, CAD_QUOTE_ID, N_OF_QUOTES } from 'constants/index'
import { validatePriceAPIUrlAndToken, validateNetworkTicker } from 'utils/validators'
import moment from 'moment'

function flattenTimestamp (timestamp: number): number {
  const date = moment((timestamp * 1000))
  const dateStart = date.startOf('day')
  return dateStart.unix()
}

// price data comes as string
interface IResponseData {
  Price_in_CAD: string
  Price_in_USD: string
}

interface AllPrices {
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

export async function getPriceForDayAndNetworkTicker (day: moment.Moment, networkTicker: string, attempt: number = 1): Promise<IResponseData> {
  try {
    const res = await axios.get(getPriceURLForDayAndNetworkTicker(day, networkTicker), {
      timeout: PRICE_API_TIMEOUT
    })

    if (res.data.success !== false) {
      const data = res.data
      if (data !== undefined) return data
    }
    throw new Error(RESPONSE_MESSAGES.FAILED_TO_FETCH_PRICE_FROM_API_500(day.format(PRICE_API_DATE_FORMAT), networkTicker).message)
  } catch (error) {
    console.error(`Problem getting price of ${networkTicker} ${day.format(HUMAN_READABLE_DATE_FORMAT)} -> ${error as string} (attempt ${attempt})`)

    if (attempt < PRICE_API_MAX_RETRIES) {
      return await getPriceForDayAndNetworkTicker(day, networkTicker, attempt + 1)
    } else {
      throw error
    }
  }
}

export async function getAllPricesByNetworkTicker (networkTicker: string, attempt: number = 1): Promise<IResponseDataDaily[]> {
  try {
    const res = await axios.get(getAllPricesURLForNetworkTicker(networkTicker), {
      timeout: PRICE_API_TIMEOUT
    })

    if (res.data.success !== false) {
      const dailyPrices: IResponseDataDaily[] = Object.entries<IResponseData>(res.data).map(([day, priceData]) => {
        return {
          day,
          ...priceData
        }
      })
      return dailyPrices
    } else { console.error(`No success when getting price of ${networkTicker} (attempt ${attempt})`) }
  } catch (error) {
    console.error(`Problem getting price of ${networkTicker} -> ${error as string} (attempt ${attempt})`)
  }

  if (attempt < PRICE_API_MAX_RETRIES) {
    return await getAllPricesByNetworkTicker(networkTicker, attempt + 1)
  } else {
    throw new Error(`Price file could not be created after ${PRICE_API_MAX_RETRIES} retries`)
  }
}

export async function syncPastDaysNewerPrices (): Promise<void> {
  const lastPrice = await prisma.price.findFirst({
    orderBy: [{ timestamp: 'desc' }],
    select: { timestamp: true }
  })

  if (lastPrice === null) throw new Error('No prices found, initial database seed did not complete successfully')

  const lastDateInDB = moment.unix(lastPrice.timestamp)
  const date = moment().startOf('day')
  const daysToRetrieve: string[] = []

  while (date.isAfter(lastDateInDB)) {
    daysToRetrieve.push(date.format(PRICE_API_DATE_FORMAT))
    date.add(-1, 'day')
  }

  const allXECPrices = await getAllPricesByNetworkTicker(NETWORK_TICKERS.ecash)
  const allBCHPrices = await getAllPricesByNetworkTicker(NETWORK_TICKERS.bitcoincash)
  await Promise.all(
    allXECPrices.filter(p => daysToRetrieve.includes(p.day)).map(async price => {
      return await upsertPricesForNetworkId(price, XEC_NETWORK_ID, moment(price.day).unix())
    }
    )
  )
  await Promise.all(
    allBCHPrices.filter(p => daysToRetrieve.includes(p.day)).map(async price => {
      return await upsertPricesForNetworkId(price, BCH_NETWORK_ID, moment(price.day).unix())
    }
    )
  )
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
    where: {
      timestamp: 0
    }
  })
}

export async function getCurrentPricesForNetworkId (networkId: number): Promise<QuoteValues> {
  const currentPrices = await prisma.price.findMany({
    where: {
      timestamp: 0,
      networkId
    }
  })
  if (currentPrices.length !== N_OF_QUOTES) {
    throw new Error(RESPONSE_MESSAGES.NO_CURRENT_PRICES_FOUND_404.message)
  }
  return {
    usd: currentPrices.filter((price) => price.quoteId === USD_QUOTE_ID)[0].value,
    cad: currentPrices.filter((price) => price.quoteId === CAD_QUOTE_ID)[0].value
  }
}

export interface QuoteValues {
  'usd': Prisma.Decimal
  'cad': Prisma.Decimal
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

export async function fetchPricesForNetworkAndTimestamp (networkId: number, timestamp: number, prisma: Prisma.TransactionClient, attempt: number = 1): Promise<AllPrices> {
  timestamp = flattenTimestamp(timestamp)
  const cadPrice = await prisma.price.findUnique({
    where: {
      Price_timestamp_quoteId_networkId_unique_constraint: {
        quoteId: CAD_QUOTE_ID,
        networkId,
        timestamp
      }
    }
  })
  const usdPrice = await prisma.price.findUnique({
    where: {
      Price_timestamp_quoteId_networkId_unique_constraint: {
        quoteId: USD_QUOTE_ID,
        networkId,
        timestamp
      }
    }
  })
  if (cadPrice === null || usdPrice === null) {
    await renewPricesForTimestamp(timestamp)
    if (attempt < PRICE_API_MAX_RETRIES) {
      return await fetchPricesForNetworkAndTimestamp(networkId, timestamp, prisma, attempt + 1)
    }
    throw new Error(RESPONSE_MESSAGES.NO_PRICES_FOUND_404(networkId, timestamp).message)
  }
  return {
    cad: cadPrice,
    usd: usdPrice
  }
}

async function renewPricesForTimestamp (timestamp: number): Promise<void> {
  const xecPrice = await getPriceForDayAndNetworkTicker(moment(timestamp * 1000), NETWORK_TICKERS.ecash)
  await upsertPricesForNetworkId(xecPrice, XEC_NETWORK_ID, timestamp)

  const bchPrice = await getPriceForDayAndNetworkTicker(moment(timestamp * 1000), NETWORK_TICKERS.bitcoincash)
  await upsertPricesForNetworkId(bchPrice, BCH_NETWORK_ID, timestamp)
}
