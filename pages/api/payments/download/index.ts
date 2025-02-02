import moment from 'moment-timezone'
import {
  RESPONSE_MESSAGES,
  DEFAULT_PAYBUTTON_CSV_FILE_DELIMITER,
  SupportedQuotesType,
  SUPPORTED_QUOTES_FROM_ID,
  PAYBUTTON_TRANSACTIONS_FILE_HEADERS,
  NETWORK_TICKERS,
  NetworkTickersType,
  NETWORK_IDS
} from 'constants/index'
import { fetchAllPaymentsByUserId } from 'services/transactionService'
import { TransactionFileData, formatNumberHeaders, formatPaybuttonTransactionsFileData, isNetworkValid, streamToCSV } from 'utils/files'
import { setSession } from 'utils/setSession'
import { NextApiResponse } from 'next'
import { fetchUserProfileFromId } from 'services/userService'
import { Payment } from 'redis/types'
import { getNetworkIdFromSlug } from 'services/networkService'

const getPaymentsFileData = (payment: Payment, currency: SupportedQuotesType, timezone: string): TransactionFileData => {
  const { values, hash, timestamp, address } = payment
  const amount = values.amount
  const value = Number(values.values[currency])
  const date = moment.tz(timestamp * 1000, timezone)
  const rate = value / Number(amount)

  return {
    amount,
    date,
    transactionId: hash,
    value,
    rate,
    currency,
    address
  }
}

const sortPaymentsByNetworkId = (payments: Payment[]): Payment[] => {
  const groupedByNetworkIdPayments = payments.reduce<Record<number, Payment[]>>((acc, payment) => {
    const networkId = payment.networkId
    if (acc[networkId] === undefined || acc[networkId] === null) {
      acc[networkId] = []
    }
    acc[networkId].push(payment)
    return acc
  }, {})

  return Object.values(groupedByNetworkIdPayments).reduce(
    (acc, curr) => acc.concat(curr),
    []
  )
}

const downloadPaymentsFileByUserId = async (
  userId: string,
  res: NextApiResponse,
  currency: SupportedQuotesType,
  timezone: string,
  networkTicker?: NetworkTickersType): Promise<void> => {
  let networkIdArray = Object.values(NETWORK_IDS)
  if (networkTicker !== undefined) {
    const slug = Object.keys(NETWORK_TICKERS).find(key => NETWORK_TICKERS[key] === networkTicker)
    const networkId = getNetworkIdFromSlug(slug ?? NETWORK_TICKERS.ecash)
    networkIdArray = [networkId]
  }
  const payments = await fetchAllPaymentsByUserId(userId, networkIdArray)
  const sortedPayments = await sortPaymentsByNetworkId(payments)
  const mappedPaymentsData = sortedPayments.map(payment => {
    const data = getPaymentsFileData(payment, currency, timezone)
    return formatPaybuttonTransactionsFileData(data)
  })
  const headers = Object.keys(PAYBUTTON_TRANSACTIONS_FILE_HEADERS)
  const humanReadableHeaders = formatNumberHeaders(Object.values(PAYBUTTON_TRANSACTIONS_FILE_HEADERS), currency)

  streamToCSV(
    mappedPaymentsData,
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

    await setSession(req, res)

    const userId = req.session.userId
    const user = await fetchUserProfileFromId(userId)

    let quoteId: number
    if (req.query.currency === undefined || req.query.currency === '' || Number.isNaN(req.query.currency)) {
      quoteId = user.preferredCurrencyId
    } else {
      quoteId = req.query.currency as number
    }
    const quoteSlug = SUPPORTED_QUOTES_FROM_ID[quoteId]
    const userReqTimezone = req.headers.timezone as string
    const userPreferredTimezone = user?.preferredTimezone
    const timezone = userPreferredTimezone !== '' ? userPreferredTimezone : userReqTimezone
    const networkTickerReq = req.query.network as string

    const networkTicker = (networkTickerReq !== '' && isNetworkValid(networkTickerReq as NetworkTickersType)) ? networkTickerReq.toUpperCase() as NetworkTickersType : undefined
    res.setHeader('Content-Type', 'text/csv')
    await downloadPaymentsFileByUserId(userId, res, quoteSlug, timezone, networkTicker)
  } catch (error: any) {
    switch (error.message) {
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
