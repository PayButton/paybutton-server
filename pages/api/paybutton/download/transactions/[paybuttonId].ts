import moment from 'moment'
import {
  PRICE_API_DATE_FORMAT,
  RESPONSE_MESSAGES,
  DEFAULT_PAYBUTTON_CSV_FILE_DELIMITER,
  PAYBUTTON_TRANSACTIONS_FILE_HEADERS,
  DECIMALS,
  SUPPORTED_QUOTES,
  DEFAULT_QUOTE_SLUG,
  SupportedQuotesType,
  NetworkTickersType,
  NETWORK_TICKERS,
  NETWORK_IDS
} from 'constants/index'
import { TransactionWithAddressAndPrices, fetchTransactionsByPaybuttonIdGroupedByNetwork, getTransactionValueInCurrency } from 'services/transactionService'
import { PaybuttonWithAddresses, fetchPaybuttonById } from 'services/paybuttonService'
import { streamToCSV } from 'utils/files'
import { setSession } from 'utils/setSession'
import { NextApiResponse } from 'next'
import { Decimal } from '@prisma/client/runtime'
import { getNetworkIdFromSlug } from 'services/networkService'

export interface TransactionFileData {
  amount: Decimal
  date: moment.Moment
  value: number
  rate: number
  transactionId: string
  currency: string
  address: string
}

export interface FormattedTransactionFileData {
  amount: string
  date: string
  value: string
  rate: string
  transactionId: string
  address: string
}
export function isCurrencyValid (currency: SupportedQuotesType): boolean {
  return SUPPORTED_QUOTES.includes(currency)
}

function isNetworkValid (slug: NetworkTickersType): boolean {
  return Object.values(NETWORK_TICKERS).includes(slug)
}

const getPaybuttonTransactionsFileData = (transaction: TransactionWithAddressAndPrices, currency: SupportedQuotesType): TransactionFileData => {
  const { amount, hash, address, timestamp } = transaction
  const value = getTransactionValueInCurrency(transaction, currency)
  const date = moment(timestamp * 1000)

  const rate = value / amount.toNumber()

  return {
    amount,
    date,
    transactionId: hash,
    value,
    rate,
    currency,
    address: address.address
  }
}

const formatPaybuttonTransactionsFileData = (data: TransactionFileData): FormattedTransactionFileData => {
  const {
    amount,
    date,
    value,
    rate,
    currency
  } = data
  return {
    ...data,
    amount: amount.toFixed(DECIMALS[currency]),
    date: date.format(PRICE_API_DATE_FORMAT),
    value: value.toFixed(2),
    rate: rate.toFixed(14)
  }
}

const formatNumberHeaders = (headers: string[], currency: string): string[] => {
  return headers.map(h => h === PAYBUTTON_TRANSACTIONS_FILE_HEADERS.value ? h + ` (${currency.toUpperCase()})` : h)
}

const downloadPaybuttonTransactionsFile = async (
  res: NextApiResponse,
  paybutton: PaybuttonWithAddresses,
  currency: SupportedQuotesType,
  networkTicker?: NetworkTickersType): Promise<void> => {
  let networkIdArray = Object.values(NETWORK_IDS)
  if (networkTicker !== undefined) {
    const slug = Object.keys(NETWORK_TICKERS).find(key => NETWORK_TICKERS[key] === networkTicker)
    const networkId = await getNetworkIdFromSlug(slug ?? NETWORK_TICKERS.ecash)
    networkIdArray = [networkId]
  }
  const transactionsGrouped = await fetchTransactionsByPaybuttonIdGroupedByNetwork(paybutton.id, networkIdArray)
  const transactions = Object.values(transactionsGrouped).reduce(
    (acc, curr) => acc.concat(curr),
    []
  )
  const mappedTransactionsData = transactions.map(tx => {
    const data = getPaybuttonTransactionsFileData(tx, currency)
    return formatPaybuttonTransactionsFileData(data)
  })
  const headers = Object.keys(PAYBUTTON_TRANSACTIONS_FILE_HEADERS)
  const humanReadableHeaders = formatNumberHeaders(Object.values(PAYBUTTON_TRANSACTIONS_FILE_HEADERS), currency)

  streamToCSV(
    mappedTransactionsData,
    headers,
    DEFAULT_PAYBUTTON_CSV_FILE_DELIMITER,
    res,
    humanReadableHeaders
  )
}

export default async (req: any, res: any): Promise<void> => {
  try {
    if (req.method !== 'GET') {
      throw new Error(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED.message)
    }
    if ((req.query.paybuttonId === undefined)) {
      throw new Error(RESPONSE_MESSAGES.PAYBUTTON_ID_NOT_PROVIDED_400.message)
    }

    await setSession(req, res)

    const userId = req.session.userId
    const paybuttonId = req.query.paybuttonId as string
    const networkTickerReq = req.query.network as string

    const networkTicker = (networkTickerReq !== '' && isNetworkValid(networkTickerReq as NetworkTickersType)) ? networkTickerReq.toUpperCase() as NetworkTickersType : undefined

    const paybutton = await fetchPaybuttonById(paybuttonId)
    if (paybutton.providerUserId !== userId) {
      throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
    }

    res.setHeader('Content-Type', 'text/csv')
    await downloadPaybuttonTransactionsFile(res, paybutton, DEFAULT_QUOTE_SLUG, networkTicker)
  } catch (error: any) {
    switch (error.message) {
      case RESPONSE_MESSAGES.PAYBUTTON_ID_NOT_PROVIDED_400.message:
        res.status(RESPONSE_MESSAGES.PAYBUTTON_ID_NOT_PROVIDED_400.statusCode)
          .json(RESPONSE_MESSAGES.PAYBUTTON_ID_NOT_PROVIDED_400)
        break
      case RESPONSE_MESSAGES.METHOD_NOT_ALLOWED.message:
        res.status(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED.statusCode)
          .json(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED)
        break
      case RESPONSE_MESSAGES.MISSING_PRICE_FOR_TRANSACTION_400.message:
        res.status(RESPONSE_MESSAGES.MISSING_PRICE_FOR_TRANSACTION_400.statusCode)
          .json(RESPONSE_MESSAGES.MISSING_PRICE_FOR_TRANSACTION_400)
        break
      default:
        res.status(500).json({ message: error.message })
    }
  }
}
