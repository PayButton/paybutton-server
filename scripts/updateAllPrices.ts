import { createPricesFile, getPricesFromFile, PriceFileData } from '../prisma-local/seeds/prices'
import { NETWORK_IDS, PRICE_API_DATE_FORMAT } from 'constants/index'
import { upsertPricesForNetworkId } from '../services/priceService'
import moment from 'moment'

async function updatePricesFromFile (prices: PriceFileData[]): Promise<void> {
  for (const price of prices) {
    const networkId = NETWORK_IDS[price.ticker]
    const priceData = {
      Price_in_CAD: price.priceInCAD,
      Price_in_USD: price.priceInUSD
    }
    const timestamp = moment.utc(price.date, PRICE_API_DATE_FORMAT).unix()
    await upsertPricesForNetworkId(
      priceData,
      networkId,
      timestamp
    )
  }
}

async function run (): Promise<void> {
  await createPricesFile()
  const prices = await getPricesFromFile()
  await updatePricesFromFile(prices)
}

void run()
