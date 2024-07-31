import Cors from 'cors'
import moment from 'moment'
import {
  PRICE_API_DATE_FORMAT,
  RESPONSE_MESSAGES,
  DEFAULT_PAYBUTTON_TRANSACTIONS_FILE_DELIMITER,
  PAYBUTTON_TRANSACTIONS_FILE_HEADERS
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
  paybuttonName: string
  transactionId: string
}

export interface FormattedTransactionFileData {
  amount: string
  date: string
  value: string
  rate: string
  paybuttonName: string
  transactionId: string
}

const cors = Cors({ methods: ['GET', 'HEAD'] })

const getPaybuttonTransactionsFileData = (transaction: TransactionWithAddressAndPrices, paybutton: PaybuttonWithAddresses): TransactionFileData => {
  const { amount, createdAt, id } = transaction
  const value = getTransactionValueInCurrency(transaction)
  const date = moment(createdAt)

  const rate = value / amount.toNumber()

  return {
    amount,
    date,
    transactionId: id,
    value,
    rate,
    paybuttonName: paybutton.name
  }
}

const formatPaybuttonTransactionsFileData = (data: TransactionFileData): FormattedTransactionFileData => {
  const {
    amount,
    date,
    value,
    rate
  } = data
  return {
    ...data,
    amount: amount.toFixed(2),
    date: date.format(PRICE_API_DATE_FORMAT),
    value: value.toFixed(2),
    rate: rate.toFixed(14)
  }
}

export const downloadPaybuttonTransactionsFile = async (res: NextApiResponse, paybutton: PaybuttonWithAddresses): Promise<void> => {
  const transactions = await fetchTransactionsByPaybuttonId(paybutton.id)

  const mappedTransactionsData = transactions.map(tx => {
    const data = getPaybuttonTransactionsFileData(tx, paybutton)
    return formatPaybuttonTransactionsFileData(data)
  })
  const headers = Object.keys(PAYBUTTON_TRANSACTIONS_FILE_HEADERS)
  const formmattedHeaders = Object.values(PAYBUTTON_TRANSACTIONS_FILE_HEADERS)

  streamToCSV(
    mappedTransactionsData,
    headers,
    DEFAULT_PAYBUTTON_TRANSACTIONS_FILE_DELIMITER,
    res,
    formmattedHeaders
  )
}

export default async (req: any, res: any): Promise<void> => {
  try {
    await new Promise((resolve, reject) => {
      cors(req, res, (result) => {
        if (result instanceof Error) {
          return reject(result)
        }
        return resolve(result)
      })
    })
    if (req.method !== 'GET') {
      throw new Error(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED.message)
    }
    if ((req.query.paybuttonId === undefined)) {
      throw new Error(RESPONSE_MESSAGES.PAYBUTTON_ID_NOT_PROVIDED_400.message)
    }
    await setSession(req, res)
    const userId = req.session.userId
    const paybuttonId = req.query.paybuttonId as string
    const paybutton = await fetchPaybuttonById(paybuttonId)

    if (paybutton.providerUserId !== userId) {
      throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
    }
    const fileName = `${paybutton.name}-${paybutton.id}-transactions.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

    await downloadPaybuttonTransactionsFile(res, paybutton)
  } catch (error: any) {
    if (error.message === RESPONSE_MESSAGES.PAYBUTTON_ID_NOT_PROVIDED_400.message) {
      res.status(RESPONSE_MESSAGES.PAYBUTTON_ID_NOT_PROVIDED_400.statusCode)
        .json(RESPONSE_MESSAGES.PAYBUTTON_ID_NOT_PROVIDED_400)
    } else if (error.message === RESPONSE_MESSAGES.METHOD_NOT_ALLOWED.message) {
      res.status(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED.statusCode)
        .json(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED)
    } else if (error.message === RESPONSE_MESSAGES.MISSING_PRICE_FOR_TRANSACTION_400.message) {
      res.status(RESPONSE_MESSAGES.MISSING_PRICE_FOR_TRANSACTION_400.statusCode)
        .json(RESPONSE_MESSAGES.MISSING_PRICE_FOR_TRANSACTION_400)
    } else {
      res.status(500).json({ message: error.message })
    }
  }
}
