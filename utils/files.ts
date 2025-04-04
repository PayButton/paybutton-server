import { Prisma } from '@prisma/client'
import {
  DECIMALS,
  DEFAULT_CSV_COLLAPSE_THRESHOLD,
  DEFAULT_MULTI_VALUES_LINE_LABEL,
  DEFAULT_PAYBUTTON_CSV_FILE_DELIMITER,
  MAX_RECORDS_PER_FILE,
  NETWORK_TICKERS,
  NETWORK_TICKERS_FROM_ID,
  NetworkTickersType,
  PAYBUTTON_TRANSACTIONS_FILE_HEADERS,
  PRICE_API_DATE_FORMAT, QUOTE_IDS, RESPONSE_MESSAGES,
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
  rate: Prisma.Decimal
  transactionId: string
  currency: string
  address?: string
  notes: string
  newtworkId: number
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
    newtworkId
  } = data
  const networkTicker = NETWORK_TICKERS_FROM_ID[newtworkId]

  return {
    ...data,
    amount: amount.toFixed(DECIMALS[networkTicker]),
    date: date.format(PRICE_API_DATE_FORMAT),
    value: value.toFixed(DECIMALS.FIAT),
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

const getUniquePrices = (tempTxGroup: TransactionsWithPaybuttonsAndPrices[], groupKey: string, currency: SupportedQuotesType): Set<number> => {
  const uniquePrices: Set<number> = new Set()
  const quoteId = QUOTE_IDS[currency.toUpperCase()]
  tempTxGroup
    .forEach(tx => {
      const price = tx.prices.find(p => p.price.quoteId === quoteId)!.price.value
      uniquePrices.add(Number(price))
    })
  if (uniquePrices.size !== 1) {
    if (uniquePrices.size > 1) {
      const nonUniquePrices = [...uniquePrices]
      const txsForPrice: Record<number, string[]> = {}
      nonUniquePrices.forEach(nonUniquePrice => {
        txsForPrice[nonUniquePrice] = tempTxGroup.filter(tx => nonUniquePrice === tx.prices.find(p => p.price.quoteId === quoteId)!.price.value.toNumber()).map(tx => tx.id)
      })
      console.error('ERROR WHEN TRYING TO COLLAPSE TXS INTO DIFFERENT PRICES:', { txsForPrice, nonUniquePrices })
    } else {
      console.error('ERROR WHEN TRYING TO COLLAPSE TXS INTO DIFFERENT PRICES, NO PRICES FOR GROUP KEY', { groupKey })
    }

    throw new Error(
      RESPONSE_MESSAGES
        .INVALID_PRICES_AMOUNT_FOR_TX_ON_CSV_CREATION_500(tempTxGroup.length).message
    )
  }
  return uniquePrices
}

const collapsePaymentsPushTx = (
  tx: TransactionsWithPaybuttonsAndPrices,
  groupKey: string,
  currency: SupportedQuotesType,
  treatedPayments: TransactionFileData[],
  timezone: string
): void => {
  const { timestamp, hash, address, amount } = tx
  const values = getTransactionValue(tx)
  const value = Number(values[currency])
  const rate = tx.prices.find(p => p.price.quoteId === QUOTE_IDS[currency.toUpperCase()])!.price.value
  const buttonNames = groupKey.split('_').slice(2).join(';')

  treatedPayments.push({
    amount,
    value,
    date: moment.tz(timestamp * 1000, timezone),
    transactionId: hash,
    rate,
    currency,
    address: address.address,
    notes: buttonNames,
    newtworkId: address.networkId
  } as TransactionFileData)
}

const collapsePaymentsPushTempGroup = (
  groupKey: string,
  tempTxGroups: Record<string, TransactionsWithPaybuttonsAndPrices[]>,
  currency: SupportedQuotesType,
  treatedPayments: TransactionFileData[],
  timezone: string
): void => {
  const tempTxGroup = tempTxGroups[groupKey]
  if (tempTxGroup === undefined || tempTxGroup.length === 0) return
  if (tempTxGroup.length === 1) {
    collapsePaymentsPushTx(tempTxGroup[0], groupKey, currency, treatedPayments, timezone)
    tempTxGroups[groupKey] = []
    return
  }
  const totalAmount = tempTxGroup.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalValue = tempTxGroup.reduce((sum, p) => sum + Number(getTransactionValue(p)[currency]), 0)
  const uniquePrices = getUniquePrices(tempTxGroup, groupKey, currency)
  const rate = new Prisma.Decimal(uniquePrices.values().next().value as number)
  const buttonNames = groupKey.split('_').slice(2).join(';')
  const notes = `${buttonNames} - ${tempTxGroup.length.toString()} transactions`

  treatedPayments.push({
    amount: totalAmount,
    value: totalValue,
    date: moment.tz(tempTxGroup[0].timestamp * 1000, timezone),
    transactionId: DEFAULT_MULTI_VALUES_LINE_LABEL,
    rate,
    currency,
    address: DEFAULT_MULTI_VALUES_LINE_LABEL,
    newtworkId: tempTxGroup[0].address.networkId,
    notes
  } as TransactionFileData)

  tempTxGroups[groupKey] = []
}

const getButtonNames = (tx: TransactionsWithPaybuttonsAndPrices, userId: string, paybuttonId?: string): string => {
  let buttonNamesKey: string = ''
  const uniqueButtonNames = new Set(
    tx.address.paybuttons
      .filter(pb => pb.paybutton.providerUserId === userId)
      .map(pb => pb.paybutton.name)
  )
  if (uniqueButtonNames.size > 1) {
    if (paybuttonId !== undefined) {
      buttonNamesKey = tx.address.paybuttons.find(pb => pb.paybutton.id === paybuttonId)?.paybutton.name ?? ''
    } else {
      buttonNamesKey = [...uniqueButtonNames].join('_')
    }
  } else {
    buttonNamesKey = uniqueButtonNames.values().next().value ?? ''
  }
  return buttonNamesKey
}

export const collapseSmallPayments = (
  payments: TransactionsWithPaybuttonsAndPrices[],
  currency: SupportedQuotesType,
  timezone: string,
  collapseThreshold: number,
  userId: string,
  paybuttonId?: string
): TransactionFileData[] => {
  const treatedPayments: TransactionFileData[] = []
  const tempTxGroups: Record<string, TransactionsWithPaybuttonsAndPrices[]> = {}

  payments.forEach((tx: TransactionsWithPaybuttonsAndPrices, index: number) => {
    const { timestamp } = tx
    const values = getTransactionValue(tx)
    const value = Number(values[currency])
    const dateKey = moment.tz(timestamp * 1000, timezone).format('YYYY-MM-DD')
    const dateKeyUTC = moment.utc(timestamp * 1000).format('YYYY-MM-DD')
    const buttonNamesKey = getButtonNames(tx, userId, paybuttonId)

    const groupKey = `${dateKey}_${dateKeyUTC}_${buttonNamesKey}`

    let nextGroupKey: string | null = ''
    const nextPayment = payments[index + 1]
    if (nextPayment !== undefined) {
      const nextDateKey = moment.tz(nextPayment.timestamp * 1000, timezone).format('YYYY-MM-DD')
      const nextDateKeyUTC = moment.utc(nextPayment.timestamp * 1000).format('YYYY-MM-DD')
      const nextButtonName = getButtonNames(nextPayment, userId, paybuttonId)

      nextGroupKey = `${nextDateKey}_${nextDateKeyUTC}_${nextButtonName}`
    } else {
      nextGroupKey = null
    }

    if (value < collapseThreshold) {
      if (tempTxGroups[groupKey] === undefined) tempTxGroups[groupKey] = []
      tempTxGroups[groupKey].push(tx)
    } else {
      Object.keys(tempTxGroups).forEach(key => {
        collapsePaymentsPushTempGroup(key, tempTxGroups, currency, treatedPayments, timezone)
      })
      collapsePaymentsPushTx(tx, groupKey, currency, treatedPayments, timezone)
    }

    if (nextGroupKey !== groupKey) {
      collapsePaymentsPushTempGroup(groupKey, tempTxGroups, currency, treatedPayments, timezone)
    }
  })

  Object.keys(tempTxGroups).forEach(key => {
    collapsePaymentsPushTempGroup(key, tempTxGroups, currency, treatedPayments, timezone)
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
  transactions.forEach(tx => {
    const { amount, hash, address, timestamp } = tx
    const value = getTransactionValueInCurrency(tx, currency)
    const date = moment.tz(timestamp * 1000, timezone)
    const rate = tx.prices.find(p => p.price.quoteId === QUOTE_IDS[currency.toUpperCase()])!.price.value
    paymentsFileData.push({
      amount,
      date,
      transactionId: hash,
      value,
      rate,
      currency,
      address: address.address,
      notes: '',
      newtworkId: address.networkId
    })
  })
  return paymentsFileData
}

export const downloadTxsFile = async (
  res: NextApiResponse,
  currency: SupportedQuotesType,
  timezone: string,
  transactions: TransactionsWithPaybuttonsAndPrices[],
  userId: string,
  paybuttonId?: string,
  collapseTransactions: boolean = true,
  collapseThreshold: number = DEFAULT_CSV_COLLAPSE_THRESHOLD
): Promise<void> => {
  const sortedPayments = sortPaymentsByNetworkId(transactions)
  let treatedPayments: TransactionFileData[] = []
  if (collapseTransactions) {
    treatedPayments = collapseSmallPayments(sortedPayments, currency, timezone, collapseThreshold, userId, paybuttonId)
  } else {
    treatedPayments = getPaybuttonTransactionsFileData(sortedPayments, currency, timezone)
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
