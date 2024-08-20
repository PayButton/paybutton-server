import moment from 'moment'
import {
  PRICE_API_DATE_FORMAT,
  RESPONSE_MESSAGES,
  DEFAULT_PAYBUTTON_CSV_FILE_DELIMITER,
  PAYBUTTON_TRANSACTIONS_FILE_HEADERS,
  DECIMALS,
  SUPPORTED_QUOTES,
  DEFAULT_QUOTE_SLUG,
  SupportedQuotesType
} from 'constants/index'
import { TransactionWithAddressAndPrices, fetchTransactionsByPaybuttonId, getTransactionValueInCurrency } from 'services/transactionService'
import { PaybuttonWithAddresses, fetchPaybuttonById } from 'services/paybuttonService'
import { streamToCSV } from 'utils/files'
import { setSession } from 'utils/setSession'
import { NextApiResponse } from 'next'
import { Decimal } from '@prisma/client/runtime'

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

function isCurrencyValid (currency: SupportedQuotesType): boolean {
  return SUPPORTED_QUOTES.includes(currency)
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
    value: value.toFixed(DECIMALS[currency]),
    rate: rate.toFixed(14)
  }
}

export const downloadPaybuttonTransactionsFile = async (
  res: NextApiResponse,
  paybutton: PaybuttonWithAddresses,
  currency: SupportedQuotesType): Promise<void> => {
  const transactions = await fetchTransactionsByPaybuttonId(paybutton.id)

  const mappedTransactionsData = transactions.map(tx => {
    const data = getPaybuttonTransactionsFileData(tx, currency)
    return formatPaybuttonTransactionsFileData(data)
  })
  const headers = Object.keys(PAYBUTTON_TRANSACTIONS_FILE_HEADERS)
  const formmattedHeaders = Object.values(PAYBUTTON_TRANSACTIONS_FILE_HEADERS)

  streamToCSV(
    mappedTransactionsData,
    headers,
    DEFAULT_PAYBUTTON_CSV_FILE_DELIMITER,
    res,
    formmattedHeaders
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
    const currency = isCurrencyValid(req.query.currency) ? req.query.currency as SupportedQuotesType : DEFAULT_QUOTE_SLUG

    const paybutton = await fetchPaybuttonById(paybuttonId)
    if (paybutton.providerUserId !== userId) {
      throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
    }

    const fileName = `${paybutton.name}-${paybutton.id}-transactions.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

    await downloadPaybuttonTransactionsFile(res, paybutton, currency)
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
