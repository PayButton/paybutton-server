import moment from 'moment-timezone'
import {
  RESPONSE_MESSAGES,
  DEFAULT_PAYBUTTON_CSV_FILE_DELIMITER,
  PAYBUTTON_TRANSACTIONS_FILE_HEADERS,
  SupportedQuotesType,
  NetworkTickersType,
  NETWORK_TICKERS,
  NETWORK_IDS,
  SUPPORTED_QUOTES_FROM_ID
} from 'constants/index'
import { TransactionWithAddressAndPrices, fetchTransactionsByPaybuttonId, getTransactionValueInCurrency } from 'services/transactionService'
import { PaybuttonWithAddresses, fetchPaybuttonById } from 'services/paybuttonService'
import { TransactionFileData, formatNumberHeaders, formatPaybuttonTransactionsFileData, isNetworkValid, streamToCSV } from 'utils/files'
import { setSession } from 'utils/setSession'
import { NextApiResponse } from 'next'
import { getNetworkIdFromSlug } from 'services/networkService'
import { fetchUserProfileFromId } from 'services/userService'

const getPaybuttonTransactionsFileData = (transaction: TransactionWithAddressAndPrices, currency: SupportedQuotesType, timezone: string): TransactionFileData => {
  const { amount, hash, address, timestamp } = transaction
  const value = getTransactionValueInCurrency(transaction, currency)
  const date = moment.tz(timestamp * 1000, timezone)
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

const sortTransactionsByNetworkId = async (transactions: TransactionWithAddressAndPrices[]): Promise<TransactionWithAddressAndPrices[]> => {
  const groupedByNetworkIdTransactions = transactions.reduce<Record<number, TransactionWithAddressAndPrices[]>>((acc, transaction) => {
    const networkId = transaction.address.networkId
    if (acc[networkId] === undefined || acc[networkId] === null) {
      acc[networkId] = []
    }
    acc[networkId].push(transaction)
    return acc
  }, {})

  return Object.values(groupedByNetworkIdTransactions).reduce(
    (acc, curr) => acc.concat(curr),
    []
  )
}

const downloadPaybuttonTransactionsFile = async (
  res: NextApiResponse,
  paybutton: PaybuttonWithAddresses,
  currency: SupportedQuotesType,
  timezone: string,
  networkTicker?: NetworkTickersType): Promise<void> => {
  let networkIdArray = Object.values(NETWORK_IDS)
  if (networkTicker !== undefined) {
    const slug = Object.keys(NETWORK_TICKERS).find(key => NETWORK_TICKERS[key] === networkTicker)
    const networkId = getNetworkIdFromSlug(slug ?? NETWORK_TICKERS.ecash)
    networkIdArray = [networkId]
  }
  const transactions = await fetchTransactionsByPaybuttonId(paybutton.id, networkIdArray)
  const sortedTransactions = await sortTransactionsByNetworkId(transactions)

  const mappedTransactionsData = sortedTransactions.map(tx => {
    const data = getPaybuttonTransactionsFileData(tx, currency, timezone)
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
    const user = await fetchUserProfileFromId(userId)
    const paybuttonId = req.query.paybuttonId as string
    const networkTickerReq = req.query.network as string

    const networkTicker = (networkTickerReq !== '' && isNetworkValid(networkTickerReq as NetworkTickersType)) ? networkTickerReq.toUpperCase() as NetworkTickersType : undefined
    let quoteId: number
    if (req.query.currency === undefined || req.query.currency === '' || Number.isNaN(req.query.currency)) {
      quoteId = user.preferredCurrencyId
    } else {
      quoteId = req.query.currency as number
    }
    const quoteSlug = SUPPORTED_QUOTES_FROM_ID[quoteId]
    const paybutton = await fetchPaybuttonById(paybuttonId)
    if (paybutton.providerUserId !== userId) {
      throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
    }
    const userReqTimezone = req.headers.timezone as string
    const userPreferredTimezone = user?.preferredTimezone
    const timezone = userPreferredTimezone !== '' ? userPreferredTimezone : userReqTimezone

    res.setHeader('Content-Type', 'text/csv')
    await downloadPaybuttonTransactionsFile(res, paybutton, quoteSlug, timezone, networkTicker)
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
