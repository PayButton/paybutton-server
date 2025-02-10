import { Prisma } from '@prisma/client'
import { DECIMALS, MAX_RECORDS_PER_FILE, NETWORK_TICKERS, NetworkTickersType, PAYBUTTON_TRANSACTIONS_FILE_HEADERS, PRICE_API_DATE_FORMAT, RESPONSE_MESSAGES, SUPPORTED_QUOTES, SupportedQuotesType } from '../constants/index'
import { NextApiResponse } from 'next'
import { Transform } from 'stream'

export interface TransactionFileData {
  amount: Prisma.Decimal | number
  date: moment.Moment
  value: number
  rate: number
  transactionId: string
  currency: string
  address?: string
}

export interface FormattedTransactionFileData {
  amount: string
  date: string
  value: string
  rate: string
  transactionId: string
  address?: string
}

export interface PaymentFileData extends TransactionFileData {
  collapsed: boolean
  notes: string
}

export interface FormattedPaymentFileData
  extends FormattedTransactionFileData {
  collapsed: boolean
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

export const formatPaybuttonTransactionsFileData = (data: PaymentFileData): FormattedPaymentFileData => {
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
