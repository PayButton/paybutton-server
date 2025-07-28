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

/**
 * Helper class to manage transaction groups for payment collapsing
 */
class TransactionGroupManager {
  private tempTxGroups: Record<string, TransactionsWithPaybuttonsAndPrices[]> = {}

  constructor(
    private currency: SupportedQuotesType,
    private timezone: string
  ) {}

  /**
   * Add a transaction to a group
   */
  addToGroup(groupKey: string, tx: TransactionsWithPaybuttonsAndPrices): void {
    if (this.tempTxGroups[groupKey] === undefined) {
      this.tempTxGroups[groupKey] = []
    }
    this.tempTxGroups[groupKey].push(tx)
  }

  /**
   * Process and clear all groups
   */
  processAllGroups(treatedPayments: TransactionFileData[]): void {
    Object.keys(this.tempTxGroups).forEach(key => {
      this.processGroup(key, treatedPayments)
    })
  }

  /**
   * Process a specific group and add to treated payments
   */
  processGroup(groupKey: string, treatedPayments: TransactionFileData[]): void {
    const tempTxGroup = this.tempTxGroups[groupKey]
    if (tempTxGroup === undefined || tempTxGroup.length === 0) return

    if (tempTxGroup.length === 1) {
      this.addSingleTransaction(tempTxGroup[0], groupKey, treatedPayments)
    } else {
      this.addCollapsedTransactionGroup(tempTxGroup, groupKey, treatedPayments)
    }

    this.tempTxGroups[groupKey] = []
  }

  /**
   * Add a single transaction to treated payments
   */
  private addSingleTransaction(
    tx: TransactionsWithPaybuttonsAndPrices,
    groupKey: string,
    treatedPayments: TransactionFileData[]
  ): void {
    const { timestamp, hash, address, amount } = tx
    const values = getTransactionValue(tx)
    const value = Number(values[this.currency])
    const rate = tx.prices.find(p => p.price.quoteId === QUOTE_IDS[this.currency.toUpperCase()])!.price.value
    const buttonNames = this.extractButtonNamesFromGroupKey(groupKey)

    treatedPayments.push({
      amount,
      value,
      date: moment.tz(timestamp * 1000, this.timezone),
      transactionId: hash,
      rate,
      currency: this.currency,
      address: address.address,
      notes: buttonNames,
      newtworkId: address.networkId
    } as TransactionFileData)
  }

  /**
   * Add a collapsed group of transactions to treated payments
   */
  private addCollapsedTransactionGroup(
    tempTxGroup: TransactionsWithPaybuttonsAndPrices[],
    groupKey: string,
    treatedPayments: TransactionFileData[]
  ): void {
    const totalAmount = tempTxGroup.reduce((sum, p) => sum + Number(p.amount), 0)
    const totalValue = tempTxGroup.reduce((sum, p) => sum + Number(getTransactionValue(p)[this.currency]), 0)
    const uniquePrices = this.getUniquePrices(tempTxGroup, groupKey)
    const rate = new Prisma.Decimal(uniquePrices.values().next().value as number)
    const buttonNames = this.extractButtonNamesFromGroupKey(groupKey)
    const notes = `${buttonNames} - ${tempTxGroup.length.toString()} transactions`

    treatedPayments.push({
      amount: totalAmount,
      value: totalValue,
      date: moment.tz(tempTxGroup[0].timestamp * 1000, this.timezone),
      transactionId: DEFAULT_MULTI_VALUES_LINE_LABEL,
      rate,
      currency: this.currency,
      address: DEFAULT_MULTI_VALUES_LINE_LABEL,
      newtworkId: tempTxGroup[0].address.networkId,
      notes
    } as TransactionFileData)
  }

  /**
   * Extract button names from group key
   */
  private extractButtonNamesFromGroupKey(groupKey: string): string {
    return groupKey.split('_').slice(2).join(';')
  }

  /**
   * Validate that all transactions in a group have the same price
   */
  private getUniquePrices(tempTxGroup: TransactionsWithPaybuttonsAndPrices[], groupKey: string): Set<number> {
    const uniquePrices: Set<number> = new Set()
    const quoteId = QUOTE_IDS[this.currency.toUpperCase()]
    
    tempTxGroup.forEach(tx => {
      const price = tx.prices.find(p => p.price.quoteId === quoteId)!.price.value
      uniquePrices.add(Number(price))
    })

    if (uniquePrices.size !== 1) {
      this.handlePriceValidationError(tempTxGroup, groupKey, uniquePrices, quoteId)
    }

    return uniquePrices
  }

  /**
   * Handle price validation errors
   */
  private handlePriceValidationError(
    tempTxGroup: TransactionsWithPaybuttonsAndPrices[],
    groupKey: string,
    uniquePrices: Set<number>,
    quoteId: number
  ): void {
    if (uniquePrices.size > 1) {
      const nonUniquePrices = [...uniquePrices]
      const txsForPrice: Record<number, string[]> = {}
      nonUniquePrices.forEach(nonUniquePrice => {
        txsForPrice[nonUniquePrice] = tempTxGroup
          .filter(tx => nonUniquePrice === tx.prices.find(p => p.price.quoteId === quoteId)!.price.value.toNumber())
          .map(tx => tx.id)
      })
      console.error('ERROR WHEN TRYING TO COLLAPSE TXS INTO DIFFERENT PRICES:', { txsForPrice, nonUniquePrices })
    } else {
      console.error('ERROR WHEN TRYING TO COLLAPSE TXS INTO DIFFERENT PRICES, NO PRICES FOR GROUP KEY', { groupKey })
    }

    throw new Error(
      RESPONSE_MESSAGES.INVALID_PRICES_AMOUNT_FOR_TX_ON_CSV_CREATION_500(tempTxGroup.length).message
    )
  }
}

/**
 * Generate a group key for a transaction based on date and button names
 */
const generateGroupKey = (
  tx: TransactionsWithPaybuttonsAndPrices,
  timezone: string,
  userId: string,
  paybuttonId?: string
): string => {
  const { timestamp } = tx
  const dateKey = moment.tz(timestamp * 1000, timezone).format('YYYY-MM-DD')
  const dateKeyUTC = moment.utc(timestamp * 1000).format('YYYY-MM-DD')
  const buttonNamesKey = extractPaybuttonNames(tx, userId, paybuttonId)

  return `${dateKey}_${dateKeyUTC}_${buttonNamesKey}`
}

/**
 * Extract paybutton names from a transaction
 */
const extractPaybuttonNames = (
  tx: TransactionsWithPaybuttonsAndPrices,
  userId: string,
  paybuttonId?: string
): string => {
  const uniqueButtonNames = new Set(
    tx.address.paybuttons
      .filter(pb => pb.paybutton.providerUserId === userId)
      .map(pb => pb.paybutton.name)
  )

  if (uniqueButtonNames.size > 1) {
    if (paybuttonId !== undefined) {
      return tx.address.paybuttons.find(pb => pb.paybutton.id === paybuttonId)?.paybutton.name ?? ''
    } else {
      return [...uniqueButtonNames].join('_')
    }
  } else {
    return uniqueButtonNames.values().next().value ?? ''
  }
}

/**
 * Add a single transaction directly to treated payments (for transactions above threshold)
 */
const addSingleTransactionToResults = (
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

export const collapseSmallPayments = (
  payments: TransactionsWithPaybuttonsAndPrices[],
  currency: SupportedQuotesType,
  timezone: string,
  collapseThreshold: number,
  userId: string,
  paybuttonId?: string
): TransactionFileData[] => {
  const treatedPayments: TransactionFileData[] = []
  const groupManager = new TransactionGroupManager(currency, timezone)

  payments.forEach((tx: TransactionsWithPaybuttonsAndPrices, index: number) => {
    const { timestamp } = tx
    const values = getTransactionValue(tx)
    const value = Number(values[currency])
    const groupKey = generateGroupKey(tx, timezone, userId, paybuttonId)

    // Determine if we need to process groups based on next payment
    const shouldProcessGroups = shouldProcessGroupsAtCurrentIndex(
      payments, index, timezone, userId, paybuttonId, groupKey
    )

    if (value < collapseThreshold) {
      // Add small payment to group for potential collapsing
      groupManager.addToGroup(groupKey, tx)
    } else {
      // Process any pending groups before adding large transaction
      groupManager.processAllGroups(treatedPayments)
      // Add large transaction directly
      addSingleTransactionToResults(tx, groupKey, currency, treatedPayments, timezone)
    }

    // Process groups when transitioning to different group key
    if (shouldProcessGroups) {
      groupManager.processGroup(groupKey, treatedPayments)
    }
  })

  // Process any remaining groups
  groupManager.processAllGroups(treatedPayments)

  return treatedPayments
}

/**
 * Determine if groups should be processed at the current index
 */
const shouldProcessGroupsAtCurrentIndex = (
  payments: TransactionsWithPaybuttonsAndPrices[],
  currentIndex: number,
  timezone: string,
  userId: string,
  paybuttonId: string | undefined,
  currentGroupKey: string
): boolean => {
  const nextPayment = payments[currentIndex + 1]
  if (nextPayment === undefined) {
    return false // No next payment, will be handled at the end
  }

  const nextGroupKey = generateGroupKey(nextPayment, timezone, userId, paybuttonId)
  return nextGroupKey !== currentGroupKey
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
