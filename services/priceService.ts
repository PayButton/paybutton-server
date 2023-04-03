import { TransactionWithAddressAndPrices } from 'services/transactionService'
import axios from 'axios'
import { appInfo } from 'config/appInfo'
import { Prisma, Price } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { NETWORK_IDS, HUMAN_READABLE_DATE_FORMAT, PRICE_API_TIMEOUT, PRICE_API_MAX_RETRIES, PRICE_API_DATE_FORMAT, RESPONSE_MESSAGES, NETWORK_TICKERS, XEC_NETWORK_ID, BCH_NETWORK_ID, USD_QUOTE_ID, CAD_QUOTE_ID, N_OF_QUOTES, UPSERT_TRANSACTION_PRICES_ON_DB_TIMEOUT } from 'constants/index'
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

interface IResponseDataDaily extends IResponseData {
  day: string
}

export async function upsertPricesForNetworkId (responseData: IResponseData, networkId: number, timestamp: number): Promise<void> {
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
}

export async function upsertCurrentPricesForNetworkId (responseData: IResponseData, networkId: number): Promise<void> {
  await upsertPricesForNetworkId(responseData, networkId, 0)
}

function getPriceURLForDayAndNetworkTicker (day: moment.Moment, networkTicker: string): string {
  validatePriceAPIUrlAndToken()
  validateNetworkTicker(networkTicker)
  return `${appInfo.priceAPIURL}/pricebydate/${appInfo.priceAPIToken}/${networkTicker}+${day.format(PRICE_API_DATE_FORMAT)}`
}

function getAllPricesURLForNetworkTicker (networkTicker: string): string {
  validatePriceAPIUrlAndToken()
  validateNetworkTicker(networkTicker)
  return `${appInfo.priceAPIURL}/dailyprices/${appInfo.priceAPIToken}/${networkTicker}`
}

export async function getPriceForDayAndNetworkTicker (day: moment.Moment, networkTicker: string, attempt: number = 1): Promise<IResponseData | null> {
  try {
    const res = await axios.get(getPriceURLForDayAndNetworkTicker(day, networkTicker), {
      timeout: PRICE_API_TIMEOUT
    })

    if (res.data.success !== false) { return res.data } else { return null }
  } catch (error) {
    console.error(`Problem getting price of ${networkTicker} ${day.format(HUMAN_READABLE_DATE_FORMAT)} -> ${error as string} (attempt ${attempt})`)

    if (attempt < PRICE_API_MAX_RETRIES) {
      return await getPriceForDayAndNetworkTicker(day, networkTicker, attempt + 1)
    } else { return null }
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
  const datesToRetrieve: moment.Moment[] = []

  while (date.isAfter(lastDateInDB)) {
    datesToRetrieve.push(date.clone())
    date.add(-1, 'day')
  }

  await Promise.all(
    Object.values(NETWORK_TICKERS).map(async (networkTicker) =>
      datesToRetrieve.map(async date => {
        const price = await getPriceForDayAndNetworkTicker(date, networkTicker)
        if (price != null) {
          await upsertPricesForNetworkId(price, NETWORK_IDS[networkTicker], date.unix())
        } else {
          console.error(`API gave a null response for ticker: ${NETWORK_IDS[networkTicker]}, date: ${date.format(HUMAN_READABLE_DATE_FORMAT)}`)
        }
      })
    ))
}

export async function syncCurrentPrices (): Promise<boolean> {
  let success = true
  const today = moment()

  const bchPrice = await getPriceForDayAndNetworkTicker(today, NETWORK_TICKERS.bitcoincash)
  if (bchPrice != null) {
    void upsertCurrentPricesForNetworkId(bchPrice, BCH_NETWORK_ID)
  } else success = false

  const xecPrice = await getPriceForDayAndNetworkTicker(today, NETWORK_TICKERS.ecash)
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
  transactionId: string
  values?: QuoteValues
}

export interface SyncTransactionPricesInput {
  networkId: number
  timestamp: number
  transactionId: string
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
  },
  {
    timeout: UPSERT_TRANSACTION_PRICES_ON_DB_TIMEOUT
  }
  )
}

export async function syncTransactionPriceValues (params: SyncTransactionPricesInput): Promise<QuoteValues | undefined> {
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
    res = await axios.get(getPriceURLForDayAndNetworkTicker(moment.unix(params.timestamp), 'XEC'))
  } else if (params.networkId === BCH_NETWORK_ID) {
    res = await axios.get(getPriceURLForDayAndNetworkTicker(moment.unix(params.timestamp), 'BCH'))
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
