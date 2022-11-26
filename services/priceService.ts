import { TransactionWithAddressAndPrices } from 'services/transactionService'
import axios from 'axios'
import { appInfo } from 'config/appInfo'
import { Prisma, Price } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { PRICE_API_DATE_FORMAT, RESPONSE_MESSAGES, XEC_NETWORK_ID, BCH_NETWORK_ID, USD_QUOTE_ID, CAD_QUOTE_ID, N_OF_QUOTES } from 'constants/index'
import moment from 'moment'

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

export async function syncCurrentPrices (): Promise<boolean> {
  const todayString = moment().format(PRICE_API_DATE_FORMAT)
  let success = true

  let res = await axios.get(`${appInfo.priceAPIURL}/BCH+${todayString}`)
  let responseData = res.data
  if (responseData.success !== false) {
    void upsertCurrentPricesForNetworkId(responseData, BCH_NETWORK_ID)
  } else success = false

  res = await axios.get(`${appInfo.priceAPIURL}/XEC+${todayString}`)
  responseData = res.data
  if (responseData.success !== false) {
    void upsertCurrentPricesForNetworkId(responseData, XEC_NETWORK_ID)
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
    return undefined
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
