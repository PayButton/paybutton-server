import { Price, Prisma } from '@prisma/client'
import { getPriceForDayTicker } from 'services/priceService'
import { TICKERS, XEC_TIMESTAMP_THRESHOLD, BCH_TIMESTAMP_THRESHOLD, NETWORKS, QUOTES, KeyValueAny } from 'constants/index'
import moment from 'moment'

import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'

interface KeyValueMoment {
  [key: string]: moment.Moment
}
interface KeyValueNumber {
  [key: string]: number
}

const FIRST_DATES_PRICES: KeyValueNumber = {
  XEC: XEC_TIMESTAMP_THRESHOLD,
  BCH: BCH_TIMESTAMP_THRESHOLD
}

interface PriceFileData {
  ticker: string
  date: string
  priceInCAD: string
  priceInUSD: string
}

export const PATH_PRICE_CSV_FILE = path.join('prisma', 'seeds', 'prices.csv')

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
    const firstDate = moment.unix(FIRST_DATES_PRICES[ticker])

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
      }
    }))
  }))

  prices.sort((a, b) => {
    if (a.ticker < b.ticker) return -1
    if (a.ticker > b.ticker) return 1
    if (a.date < b.date) return -1
    if (a.date > b.date) return 1
    return 0
  })
  await writeToFile(PATH_PRICE_CSV_FILE, prices)

  const finish = moment()
  console.log(`\n\nstart: ${start.format('HH:mm:ss')}\nfinish: ${finish.format('HH:mm:ss')}\nduration: ${(finish.diff(start) / 1000).toFixed(2)} seconds`)
}

async function readCsv (filePath: string): Promise<string[][]> {
  return await new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (error, data) => {
      if (error != null) {
        reject(error)
      } else {
        resolve(
          data
            .split('\n')
            .map((row) => row.split(','))
        )
      }
    })
  })
}

async function fileExists (filePath: string): Promise<boolean> {
  try {
    await fs.promises.stat(filePath)
    return true
  } catch (error) {
    return false
  }
}

async function getPricesFromFile (attempt: number = 1): Promise<PriceFileData[]> {
  if (await fileExists(PATH_PRICE_CSV_FILE)) {
    const csvContent = await readCsv(PATH_PRICE_CSV_FILE)
    const res: PriceFileData[] = []

    for (let i = 1; i < csvContent.length; i++) {
      const newPrice: KeyValueAny = {}
      for (let j = 0; j < csvContent[0].length; j++) { // headers
        newPrice[csvContent[0][j]] = csvContent[i][j]
      }
      // ignore some prices that come empty
      if (newPrice.priceInCAD !== '' && newPrice.priceInUSD !== '') { res.push(newPrice as PriceFileData) }
    }

    return res
  } else {
    if (attempt > 3) { throw new Error('Already attempted 3 times to create price files without success') }

    await createPricesFile()
    return await getPricesFromFile(++attempt)
  }
}

export async function getPrices (): Promise<Price[]> {
  const quotes = Object.keys(QUOTES)
  const pricesFromFile = await getPricesFromFile()

  const prices: Price[][] = pricesFromFile.map(price =>
    quotes.map(quote => {
      return {
        id: 0,
        value: new Prisma.Decimal(price[`priceIn${quote}` as keyof PriceFileData]),
        createdAt: new Date(),
        updatedAt: new Date(),
        timestamp: moment(price.date).unix(),
        networkId: NETWORKS[price.ticker],
        quoteId: QUOTES[quote]
      }
    })
  )

  return prices.reduce((res, val) => res.concat(val), [])
}

// -------------------- run once script --------------------

// used to find the first date of each ticker
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
// @ts-expect-error
export async function findFirstDates (): Promise<void> {
  const dates: KeyValueMoment = {}
  dates[TICKERS.ecash] = moment('2020-11-12')
  dates[TICKERS.bitcoincash] = moment('2017-07-30')

  await Promise.all(Object.values(TICKERS).map(async (ticker) => {
    dates[ticker] = await findFirstDate(ticker, dates[ticker])
  }))

  console.log(`xec: ${dates[TICKERS.ecash].format('YYYY-MM-DD')}, bch: ${dates[TICKERS.bitcoincash].format('YYYY-MM-DD')}`)
}

// -------------------- run once script --------------------
