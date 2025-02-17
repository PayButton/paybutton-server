import { Prisma } from '@prisma/client'
import {
  DECIMALS,
  DEFAULT_CSV_COLLAPSE_THRESHOLD,
  DEFAULT_MULTI_VALUES_FILE_DELIMITER,
  DEFAULT_PAYBUTTON_CSV_FILE_DELIMITER,
  MAX_RECORDS_PER_FILE,
  NETWORK_TICKERS,
  NetworkTickersType,
  PAYBUTTON_TRANSACTIONS_FILE_HEADERS,
  PRICE_API_DATE_FORMAT, RESPONSE_MESSAGES,
  SUPPORTED_QUOTES,
  SupportedQuotesType
} from '../constants/index'
import { NextApiResponse } from 'next'
import { Transform } from 'stream'
import moment from 'moment-timezone'
import { TransactionsWithPaybuttonsAndPrices, getTransactionValue, getTransactionValueInCurrency } from 'services/transactionService'

export interface TransactionFileData {
  amount: Prisma.Decimal | number
  date: moment.Moment
  value: number
  rate: number
  transactionId: string
  currency: string
  address?: string
  notes: string
}

export interface FormattedTransactionFileData {
  amount: string
  date: string
  value: string
  rate: string
  transactionId: string
  address?: string
  notes: string

}

export function isCurrencyValid (currency: SupportedQuotesType): boolean {
  return SUPPORTED_QUOTES.includes(currency)
}

export function isNetworkValid (slug: NetworkTickersType): boolean {
  return Object.values(NETWORK_TICKERS).includes(slug)
}

export const formatNumberHeaders = (headers: string[], currency: string): string[] => {
  return headers.map(h => h === PAYBUTTON_TRANSACTIONS_FILE_HEADERS.value ? h + ` (${currency.toUpperCase()})` : h)
}

export const formatPaybuttonTransactionsFileData = (data: TransactionFileData): FormattedTransactionFileData => {
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

export function valuesToCsvLine (values: string[], delimiter: string): string {
  return values.join(delimiter) + '\n'
}

export function getDataFromValues (data: Record<string, any>, headers: string[]): Record<string, any> {
  const result: Record<string, any> = {}
  headers.forEach(header => {
    result[header] = data[header]
  })

  return result
}

export const getTransform = (headers: string[], delimiter: string): Transform => new Transform({
  objectMode: true,
  transform (chunk: any, encoding: BufferEncoding, callback: () => void) {
    const csvLine = valuesToCsvLine(headers.map(header => chunk[header]), delimiter)
    this.push(csvLine)
    callback()
  }
})

export function streamToCSV (
  values: object[],
  headers: string[],
  delimiter: string,
  res: NextApiResponse,
  formattedHeaders?: string[]): void {
  const maxRecords = MAX_RECORDS_PER_FILE
  const csvLineHeaders = valuesToCsvLine(formattedHeaders ?? headers, delimiter)
  const transform = getTransform(headers, delimiter)

  try {
    res.write(csvLineHeaders)
    values.slice(0, maxRecords).forEach((data: object) => {
      const formattedData = getDataFromValues(data, headers)
      transform.write(formattedData)
    })

    transform.end()
    transform.pipe(res)
  } catch (error: any) {
    console.error(error.message)
    throw new Error(RESPONSE_MESSAGES.COULD_NOT_DOWNLOAD_FILE_500.message)
  }
}

export const collapseSmallPayments = (
  payments: TransactionsWithPaybuttonsAndPrices[],
  currency: SupportedQuotesType,
  timezone: string,
  collapseThreshold: number): TransactionFileData[] => {
  const treatedPayments: TransactionFileData[] = []
  let tempGroup: TransactionsWithPaybuttonsAndPrices[] = []

  payments.forEach((tx: TransactionsWithPaybuttonsAndPrices, index: number) => {
    const { timestamp, hash, address, amount } = tx
    const values = getTransactionValue(tx)
    const value = Number(values[currency])
    const rate = value / Number(amount)
    const dateKey = moment.tz(timestamp * 1000, timezone).format('YYYY-MM-DD')

    const nextPayment = payments[index + 1]
    const nextDateKey = (nextPayment !== undefined) ? moment.tz(nextPayment.timestamp * 1000, timezone).format('YYYY-MM-DD') : null

    if (value < collapseThreshold) {
      tempGroup.push(tx)
    } else {
      if (tempGroup.length > 0) {
        const totalAmount = tempGroup.reduce((sum, p) => sum + Number(p.amount), 0)
        const totalValue = tempGroup.reduce((sum, p) => sum + Number(getTransactionValue(p)[currency]), 0)
        const rate = totalValue / totalAmount
        const buttonName = tempGroup[0].address.paybuttons[0].paybutton.name
        const notes = `${buttonName} - ${tempGroup.length.toString()} transactions`

        treatedPayments.push({
          amount: totalAmount,
          value: totalValue,
          date: moment.tz(tempGroup[0].timestamp * 1000, timezone),
          transactionId: tempGroup.map(p => p.hash).join(DEFAULT_MULTI_VALUES_FILE_DELIMITER),
          rate,
          currency,
          address: Array.from(new Set(tempGroup.map(p => p.address.address))).join(DEFAULT_MULTI_VALUES_FILE_DELIMITER),
          notes
        } as TransactionFileData)

        tempGroup = []
      }

      const notes = ''

      treatedPayments.push({
        amount,
        value,
        date: moment.tz(timestamp * 1000, timezone),
        transactionId: hash,
        rate,
        currency,
        address: address.address,
        notes
      } as TransactionFileData)
    }

    // If it's the last small payment in sequence or the next payment is from another day, collapse it
    if (tempGroup.length > 1 && ((nextPayment === undefined) || nextDateKey !== dateKey)) {
      const totalAmount = tempGroup.reduce((sum, p) => sum + Number(p.amount), 0)
      const totalValue = tempGroup.reduce((sum, p) => sum + Number(getTransactionValue(p)[currency]), 0)
      const rate = totalValue / totalAmount
      const buttonName = tempGroup[0].address.paybuttons[0].paybutton.name
      const notes = `${buttonName} - ${tempGroup.length.toString()} transactions`

      treatedPayments.push({
        amount: totalAmount,
        value: totalValue,
        date: moment.tz(tempGroup[0].timestamp * 1000, timezone),
        transactionId: tempGroup.map(p => p.hash).join(DEFAULT_MULTI_VALUES_FILE_DELIMITER),
        rate,
        currency,
        address: Array.from(new Set(tempGroup.map(p => p.address.address))).join(DEFAULT_MULTI_VALUES_FILE_DELIMITER),
        notes
      } as TransactionFileData)

      tempGroup = []
    }
  })

  return treatedPayments
}

const sortPaymentsByNetworkId = (payments: TransactionsWithPaybuttonsAndPrices[]): TransactionsWithPaybuttonsAndPrices[] => {
  const groupedByNetworkIdPayments = payments.reduce<Record<number, TransactionsWithPaybuttonsAndPrices[]>>((acc, transaction) => {
    const networkId = transaction.address.networkId
    if (acc[networkId] === undefined || acc[networkId] === null) {
      acc[networkId] = []
    }
    acc[networkId].push(transaction)
    return acc
  }, {})

  return Object.values(groupedByNetworkIdPayments).reduce(
    (acc, curr) => acc.concat(curr),
    []
  )
}

const getPaybuttonTransactionsFileData = (transactions: TransactionsWithPaybuttonsAndPrices[], currency: SupportedQuotesType, timezone: string): TransactionFileData[] => {
  const paymentsFileData: TransactionFileData[] = []
  transactions.forEach(element => {
    const { amount, hash, address, timestamp } = element
    const value = getTransactionValueInCurrency(element, currency)
    const date = moment.tz(timestamp * 1000, timezone)
    const rate = value / amount.toNumber()
    paymentsFileData.push({
      amount,
      date,
      transactionId: hash,
      value,
      rate,
      currency,
      address: address.address,
      notes: ''
    })
  })
  return paymentsFileData
}

export const downloadTxsFile = async (
  res: NextApiResponse,
  currency: SupportedQuotesType,
  timezone: string,
  transactions: TransactionsWithPaybuttonsAndPrices[],
  collapseTransactions: boolean = true,
  collapseThreshold: number = DEFAULT_CSV_COLLAPSE_THRESHOLD): Promise<void> => {
  const sortedPayments = sortPaymentsByNetworkId(transactions)
  let treatedPayments: TransactionFileData[] = []
  if (collapseTransactions) {
    treatedPayments = collapseSmallPayments(sortedPayments, currency, timezone, collapseThreshold)
  } else {
    treatedPayments = getPaybuttonTransactionsFileData(transactions, currency, timezone)
  }
  const mappedPaymentsData = treatedPayments.map(payment => formatPaybuttonTransactionsFileData(payment))

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
