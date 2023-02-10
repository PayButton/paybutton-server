import { TransactionWithAddressAndPrices } from 'services/transactionService'
import axios from 'axios'
import { appInfo } from 'config/appInfo'
import { Prisma, Price } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { FIRST_DATES_PRICES, PRICE_API_DATE_FORMAT, RESPONSE_MESSAGES, TICKERS, XEC_NETWORK_ID, BCH_NETWORK_ID, USD_QUOTE_ID, CAD_QUOTE_ID, N_OF_QUOTES } from 'constants/index'
import moment from 'moment'
import fs from 'fs'
import { promisify } from 'util'
import * as path from 'path'

function flattenTimestamp (timestamp: number): number {
  const date = moment((timestamp * 1000))
  const dateStart = date.startOf('day')
  return dateStart.unix()
}

function dateStringFromTimestamp (timestamp: number): string {
  const isoString = (new Date(timestamp * 1000)).toISOString()
  return isoString.split('T')[0].replace(/-/g, '') // YYYYMMDD
}

// price data comes as string
interface IResponseData {
  Price_in_CAD: string
  Price_in_USD: string
}
interface KeyValueMoment {
  [key: string]: moment.Moment
}

export async function upsertCurrentPricesForNetworkId (responseData: IResponseData, networkId: number): Promise<void> {
  await prisma.price.upsert({
    where: {
      Price_timestamp_quoteId_networkId_unique_constraint: {
        quoteId: USD_QUOTE_ID,
        networkId,
        timestamp: 0
      }
    },
    create: {
      quoteId: USD_QUOTE_ID,
      networkId,
      timestamp: 0,
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
        timestamp: 0
      }
    },
    create: {
      quoteId: CAD_QUOTE_ID,
      networkId,
      timestamp: 0,
      value: new Prisma.Decimal(responseData.Price_in_CAD)
    },
    update: {
      value: new Prisma.Decimal(responseData.Price_in_CAD)
    }
  })
}

async function getPriceForDayTicker (day: moment.Moment, ticker: string): Promise<IResponseData | null> {
  if (appInfo.priceAPIURL === '') {
    throw new Error(RESPONSE_MESSAGES.MISSING_PRICE_API_URL_400.message)
  }
  if (!Object.values(TICKERS).includes(ticker)) {
    throw new Error(RESPONSE_MESSAGES.INVALID_TICKER_400.message)
  }

  const dayString = day.format(PRICE_API_DATE_FORMAT)
  try {
    const res = await axios.get(`${appInfo.priceAPIURL}/${ticker}+${dayString}`, {
      timeout: 10 * 1000
    })

    if (res.data.success !== false) { return res.data } else { return null }
  } catch (error) {
    console.error(error?.response?.status)
    return null
  }
}

export async function syncCurrentPrices (): Promise<boolean> {
  let success = true
  const today = moment()

  const bchPrice = await getPriceForDayTicker(today, TICKERS.bitcoincash)
  if (bchPrice != null) {
    void upsertCurrentPricesForNetworkId(bchPrice, BCH_NETWORK_ID)
  } else success = false

  const xecPrice = await getPriceForDayTicker(today, TICKERS.ecash)
  if (xecPrice != null) {
    void upsertCurrentPricesForNetworkId(xecPrice, XEC_NETWORK_ID)
  } else success = false

  return success
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

export async function syncPricesFromTransactionList (transactions: TransactionWithAddressAndPrices[]): Promise<void> {
  const promisedValuesList: Array<Promise<QuoteValues | undefined>> = []
  const syncParamsList: SyncTransactionPricesInput[] = []
  // create promises to request prices
  for (const transaction of transactions) {
    const syncParams: SyncTransactionPricesInput = {
      networkId: transaction.address.networkId,
      timestamp: flattenTimestamp(transaction.timestamp),
      transactionId: transaction.id
    }
    syncParamsList.push(syncParams)
    promisedValuesList.push(syncTransactionPriceValues(syncParams))
  }
  // send the requests
  const valuesList = await Promise.all(promisedValuesList)
  // save it on the database
  const createPricesInputList: CreatePricesFromTransactionInput[] = syncParamsList.map((syncParams, idx) => {
    return {
      ...syncParams,
      values: valuesList[idx]
    }
  })
  for (const createPricesInput of createPricesInputList) {
    await createTransactionPrices(createPricesInput)
  }
}

export interface QuoteValues {
  'usd': Prisma.Decimal
  'cad': Prisma.Decimal
}
export interface CreatePricesFromTransactionInput {
  timestamp: number
  networkId: number
  transactionId: number
  values?: QuoteValues
}

export interface SyncTransactionPricesInput {
  networkId: number
  timestamp: number
  transactionId: number
}

export async function createTransactionPrices (params: CreatePricesFromTransactionInput): Promise<void> {
  // Create USD price, if it does not already exist
  return await prisma.$transaction(async (prisma) => {
    if (params.values === undefined) return
    const usdPrice = await prisma.price.upsert({
      where: {
        Price_timestamp_quoteId_networkId_unique_constraint: {
          quoteId: USD_QUOTE_ID,
          networkId: params.networkId,
          timestamp: params.timestamp
        }
      },
      create: {
        value: params.values.usd,
        timestamp: params.timestamp,
        network: {
          connect: {
            id: params.networkId
          }
        },
        quote: {
          connect: {
            id: USD_QUOTE_ID
          }
        }
      },
      update: {}
    })
    // Connect it with transaction, if not already connected
    void await prisma.pricesOnTransactions.upsert({
      where: {
        priceId_transactionId: {
          priceId: usdPrice.id,
          transactionId: params.transactionId
        }
      },
      create: {
        transactionId: params.transactionId,
        priceId: usdPrice.id
      },
      update: {}
    })

    // Create CAD price, if it does not already exist
    const cadPrice = await prisma.price.upsert({
      where: {
        Price_timestamp_quoteId_networkId_unique_constraint: {
          quoteId: CAD_QUOTE_ID,
          networkId: params.networkId,
          timestamp: params.timestamp
        }
      },
      create: {
        value: params.values.cad,
        timestamp: params.timestamp,
        network: {
          connect: {
            id: params.networkId
          }
        },
        quote: {
          connect: {
            id: CAD_QUOTE_ID
          }
        }
      },
      update: {}
    })
    // Connect it with transaction, if not already connected
    void await prisma.pricesOnTransactions.upsert({
      where: {
        priceId_transactionId: {
          priceId: cadPrice.id,
          transactionId: params.transactionId
        }
      },
      create: {
        transactionId: params.transactionId,
        priceId: cadPrice.id
      },
      update: {}
    })
  })
}

export async function syncTransactionPriceValues (params: SyncTransactionPricesInput): Promise<QuoteValues | undefined> {
  if (appInfo.priceAPIURL === '') {
    throw new Error(RESPONSE_MESSAGES.MISSING_PRICE_API_URL_400.message)
  }

  const dateString = dateStringFromTimestamp(params.timestamp)
  const existentPrices = await prisma.price.findMany({
    where: {
      networkId: params.networkId,
      timestamp: flattenTimestamp(params.timestamp)
    }
  })

  if (existentPrices.length === N_OF_QUOTES) {
    let cadPrice, usdPrice
    for (const price of existentPrices) {
      void await prisma.pricesOnTransactions.upsert({
        where: {
          priceId_transactionId: {
            priceId: price.id,
            transactionId: params.transactionId
          }
        },
        create: {
          transactionId: params.transactionId,
          priceId: price.id
        },
        update: {}
      })
      if (price.quoteId === USD_QUOTE_ID) {
        usdPrice = price.value
      } else if (price.quoteId === CAD_QUOTE_ID) {
        cadPrice = price.value
      }
    }
    if (cadPrice === undefined || usdPrice === undefined) {
      throw new Error(RESPONSE_MESSAGES.INVALID_PRICE_STATE_400.message)
    }
    return {
      cad: cadPrice,
      usd: usdPrice
    }
  }

  let res

  if (params.networkId === XEC_NETWORK_ID) {
    res = await axios.get(`${appInfo.priceAPIURL}/XEC+${dateString}`)
  } else if (params.networkId === BCH_NETWORK_ID) {
    res = await axios.get(`${appInfo.priceAPIURL}/BCH+${dateString}`)
  } else {
    throw new Error(RESPONSE_MESSAGES.INVALID_NETWORK_ID_400.message)
  }
  const responseData = res.data
  if (responseData.success === false) {
    return undefined
  }
  const usdPriceString = responseData.Price_in_USD
  const cadPriceString = responseData.Price_in_CAD

  return {
    usd: new Prisma.Decimal(usdPriceString),
    cad: new Prisma.Decimal(cadPriceString)
  }
}

// run once script, used to find the first date of each ticker
async function findFirstDate (ticker: string, searchStart: moment.Moment): Promise<moment.Moment> {
  if (moment().isBefore(searchStart)) return moment()

  let i = 0

  while (true) {
    const price = await getPriceForDayTicker(searchStart, ticker)
    if (price?.Price_in_USD === undefined) {
      break
    }
    searchStart.add(1, 'day')
    console.log(`${ticker} ${i} ${searchStart.format('YYYY-MM-DD')}`)
    i++
  }

  return searchStart.clone()
}

// run once script, first date values found were:
//     xec: 2020-11-14, bch: 2017-08-01
export async function findFirstDates (): Promise<void> {
  const dates: KeyValueMoment = {}
  dates[TICKERS.ecash] = moment('2020-11-12')
  dates[TICKERS.bitcoincash] = moment('2017-07-30')

  await Promise.all(Object.values(TICKERS).map(async (ticker) => {
    dates[ticker] = await findFirstDate(ticker, dates[ticker])
  }))

  console.log(`xec: ${dates[TICKERS.ecash].format('YYYY-MM-DD')}, bch: ${dates[TICKERS.bitcoincash].format('YYYY-MM-DD')}`)
}
interface PriceFileData {
  ticker: string
  date: string
  priceInCAD: string
  priceInUSD: string
}

async function writeToFile (fileName: string, content: PriceFileData[]): Promise<void> {
  const writeFile = promisify(fs.writeFile)

  const headers = ['ticker', 'date', 'priceInCAD', 'priceInUSD']
  const rows = content.map(({ ticker, date, priceInCAD, priceInUSD }) => [ticker, date, priceInCAD, priceInUSD])
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')

  await writeFile(fileName, csv, 'utf8')
}

export async function createPricesFile (): Promise<void> {
  console.log('Price file creation started')
  const start = moment()
  const prices: PriceFileData[] = []

  await Promise.all(Object.values(TICKERS).map(async (ticker) => {
    const today = moment()
    const firstDate = moment(FIRST_DATES_PRICES[ticker])

    const dates: moment.Moment[] = []
    while (firstDate.isBefore(today)) {
      dates.push(firstDate.clone())
      firstDate.add(1, 'days')
    }

    await Promise.all(dates.map(async date => {
      const price = await getPriceForDayTicker(date, ticker)
      if (price != null) {
        prices.push({
          ticker,
          date: date.format('YYYYMMDD'),
          priceInCAD: price.Price_in_CAD,
          priceInUSD: price.Price_in_USD
        })
      } else console.error(`${ticker} ${date.format('YYYYMMDD')} came back null`)
    }))
  }))

  prices.sort((a, b) => {
    if (a.ticker < b.ticker || a.date < b.date) return -1
    return 1
  })
  await writeToFile(path.join('scripts', 'db', 'prices.csv'), prices)

  const finish = moment()
  console.log(`\n\nstart: ${start.format('HH:mm:ss')}\nfinish: ${finish.format('HH:mm:ss')}\nduration: ${(finish.diff(start) / 1000).toFixed(2)} seconds`)
}
