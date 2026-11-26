import { Price, Prisma } from '@prisma/client'
import { getAllPricesByNetworkTicker } from 'services/priceService'
import { NETWORK_TICKERS, NETWORK_IDS, QUOTE_IDS, KeyValueT, PRICE_API_DATE_FORMAT } from 'constants/index'
import { readCsv, fileExists, isEmpty } from 'utils/index'
import { mockPrices } from 'tests/mockedObjects'
import moment from 'moment'
import * as fs from 'fs'
import * as path from 'path'

export interface PriceFileData extends KeyValueT<string> {
  ticker: string
  date: string
  priceInCAD: string
  priceInUSD: string
}

export const PATH_PRICE_CSV_FILE = path.join('prisma-local', 'seeds', 'prices.csv')

const CSV_HEADERS = ['ticker', 'date', 'priceInCAD', 'priceInUSD']

function comparePrices (a: PriceFileData, b: PriceFileData): number {
  if (a.ticker < b.ticker) return -1
  if (a.ticker > b.ticker) return 1
  if (a.date < b.date) return -1
  if (a.date > b.date) return 1
  return 0
}

async function writePricesToFile (content: PriceFileData[]): Promise<void> {
  const rows = [...content]
    .sort(comparePrices)
    .map(({ ticker, date, priceInCAD, priceInUSD }) => [ticker, date, priceInCAD, priceInUSD])
  const csv = [CSV_HEADERS, ...rows].map(row => row.join(',')).join('\n') + '\n'

  await fs.promises.writeFile(PATH_PRICE_CSV_FILE, csv, 'utf8')
}

async function fetchPricesForTicker (networkTicker: string): Promise<PriceFileData[]> {
  const pricesByNetworkTicker = await getAllPricesByNetworkTicker(networkTicker, true)

  return pricesByNetworkTicker.map(price => {
    if (isEmpty(price.Price_in_CAD) || isEmpty(price.Price_in_USD)) { throw new Error(`Price came back with at least one quote empty from API: ${JSON.stringify(price)}`) }

    return {
      ticker: networkTicker,
      date: price.day,
      priceInCAD: price.Price_in_CAD,
      priceInUSD: price.Price_in_USD
    }
  })
}

export async function createPricesFile (): Promise<void> {
  console.log('Price file creation started')
  const start = moment()

  const pricesPerTicker = await Promise.all(Object.values(NETWORK_TICKERS).map(fetchPricesForTicker))
  await writePricesToFile(pricesPerTicker.flat())

  const finish = moment()
  console.log(`\n\nstart: ${start.format('HH:mm:ss')}\nfinish: ${finish.format('HH:mm:ss')}\nduration: ${(finish.diff(start) / 1000).toFixed(2)} seconds`)
}

async function readPricesFile (): Promise<PriceFileData[]> {
  if (!await fileExists(fs, PATH_PRICE_CSV_FILE)) return []

  const csvContent = (await readCsv(fs, PATH_PRICE_CSV_FILE)).map(line => line.map(cell => cell.trim()))
  const res: PriceFileData[] = []

  const headers = csvContent[0]
  const data = csvContent.slice(1)

  for (const line of data) {
    const newPrice: KeyValueT<string> = {}
    for (const header of headers) {
      newPrice[header] = line[headers.indexOf(header)]
    }
    // ignore blank lines and prices that may come empty
    if (!isEmpty(newPrice.date) && !isEmpty(newPrice.priceInCAD) && !isEmpty(newPrice.priceInUSD)) { res.push(newPrice as PriceFileData) }
  }

  return res
}

/**
 * Returns the days (YYYY-MM-DD, UTC) missing for a single ticker: gaps between
 * its first and last known day, plus every day after the last one up to `today`.
 * An empty list of prices means the whole history is missing, signaled by `null`.
 */
export function getMissingDays (prices: PriceFileData[], today: moment.Moment): string[] | null {
  if (prices.length === 0) return null

  const knownDays = new Set(prices.map(p => p.date))
  const sortedDays = [...knownDays].sort()
  const lastDay = moment.utc(today).startOf('day')

  const missing: string[] = []
  const cursor = moment.utc(sortedDays[0], PRICE_API_DATE_FORMAT)
  while (cursor.isSameOrBefore(lastDay)) {
    const day = cursor.format(PRICE_API_DATE_FORMAT)
    if (!knownDays.has(day)) missing.push(day)
    cursor.add(1, 'day')
  }
  return missing
}

/**
 * Makes sure the git-ignored prices file is complete and up to date: for each
 * ticker, fills any gap and appends the days after its newest price. Only
 * tickers with something missing are fetched from the price API, and the file
 * is only rewritten when new prices were added.
 */
export async function syncPricesFile (today = moment.utc()): Promise<PriceFileData[]> {
  const pricesFromFile = await readPricesFile()
  const result: PriceFileData[] = []
  let changed = false

  for (const ticker of Object.values(NETWORK_TICKERS)) {
    const tickerPrices = pricesFromFile.filter(p => p.ticker === ticker)
    result.push(...tickerPrices)

    const missingDays = getMissingDays(tickerPrices, today)
    if (missingDays !== null && missingDays.length === 0) continue

    console.log(missingDays === null
      ? `[PRICES] No ${ticker} prices in file, fetching full history...`
      : `[PRICES] ${missingDays.length} ${ticker} days missing in file (${missingDays[0]}..${missingDays[missingDays.length - 1]}), fetching...`)

    const knownDays = new Set(tickerPrices.map(p => p.date))
    const newPrices = (await fetchPricesForTicker(ticker)).filter(p => !knownDays.has(p.date))
    if (newPrices.length > 0) {
      result.push(...newPrices)
      changed = true
    }

    const stillMissing = getMissingDays([...tickerPrices, ...newPrices], today)
    if (stillMissing !== null && stillMissing.length > 0) {
      console.warn(`[PRICES] API did not return ${stillMissing.length} ${ticker} days: ${stillMissing.join(', ')}`)
    }
  }

  if (changed) await writePricesToFile(result)

  return result
}

export async function getPricesFromFile (): Promise<PriceFileData[]> {
  return await syncPricesFile()
}

export async function getPrices (): Promise<Price[]> {
  if (process.env.NODE_ENV === 'test') return mockPrices

  const quotes = Object.keys(QUOTE_IDS)
  const pricesFromFile = await getPricesFromFile()

  const prices: Price[][] = pricesFromFile.map(price =>
    quotes.map(quote => {
      return {
        id: 0,
        value: new Prisma.Decimal(price[`priceIn${quote}` as keyof PriceFileData]),
        createdAt: new Date(),
        updatedAt: new Date(),
        timestamp: moment.utc(price.date, PRICE_API_DATE_FORMAT).unix(),
        networkId: NETWORK_IDS[price.ticker],
        quoteId: QUOTE_IDS[quote]
      }
    })
  )

  return prices.reduce((res, val) => res.concat(val), [])
}
