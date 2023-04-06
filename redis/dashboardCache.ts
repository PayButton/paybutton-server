import { redis } from 'redis/clientInstance'
import { Prisma } from '@prisma/client'
import { getTransactionValue, TransactionWithAddressAndPrices } from 'services/transactionService'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { RESPONSE_MESSAGES, PAYMENT_WEEK_KEY_FORMAT, KeyValueT } from 'constants/index'
import moment from 'moment'

export interface ChartData {
  labels: string[]
  datasets: [
    {
      data: number[] | Prisma.Decimal[]
      borderColor: string
    }
  ]
}

export interface PeriodData {
  revenue: ChartData
  payments: ChartData
  totalRevenue: Prisma.Decimal
  totalPayments: number
}

export interface DashboardData {
  thirtyDays: PeriodData
  year: PeriodData
  sevenDays: PeriodData
  all: PeriodData
  paymentList: Payment[]
  total: {
    revenue: Prisma.Decimal
    payments: number
    buttons: number
  }
}

export interface ButtonDisplayData {
  name: string
  id: string
}

export interface Payment {
  timestamp: number
  value: Prisma.Decimal
  networkId: number
  hash: string
  buttonDisplayDataList: ButtonDisplayData[]
}

const getPaymentWeekKey = (userId: string, payment: Payment): string => {
  return `${userId}:payment:${moment.unix(payment.timestamp).format(PAYMENT_WEEK_KEY_FORMAT)}`
}

export const userHasCachedPayments = async (userId: string): Promise<boolean> => {
  return (await redis.keys(`${userId}:payment:*`)).length > 0
}

const getCachedWeekKeys = async (userId: string): Promise<string[]> => {
  return await redis.keys(`${userId}:payment:*`)
}

export const getPaymentsFromTransactionsAndButtons = async (transactionList: TransactionWithAddressAndPrices[], buttons: PaybuttonWithAddresses[]): Promise<Payment[]> => {
  const paymentList: Payment[] = []
  for (const t of transactionList) {
    const XECValue = (await getTransactionValue(t)).usd
    paymentList.push({
      timestamp: t.timestamp,
      value: XECValue,
      networkId: t.address.networkId,
      hash: t.hash,
      buttonDisplayDataList: buttons.filter(button => button.addresses.some(addr => addr.address.id === t.addressId)).map(
        (b) => {
          return {
            name: b.name,
            id: b.id
          }
        }
      )
    })
  }

  return paymentList.filter((p) => p.value > new Prisma.Decimal(0))
}

export const getCachedPayments = async (userId: string): Promise<Payment[]> => {
  const weekKeys = await getCachedWeekKeys(userId)
  let allPayments: Payment[] = []
  for (const weekKey of weekKeys) {
    const paymentsString = await redis.get(weekKey)
    if (paymentsString === null) {
      throw new Error(RESPONSE_MESSAGES.CACHED_PAYMENT_NOT_FOUND_404.message)
    }
    allPayments = allPayments.concat(JSON.parse(paymentsString))
  }
  return allPayments
}

export const cachePayments = async (userId: string, paymentList: Payment[]): Promise<void> => {
  const paymentsByWeek: KeyValueT<Payment[]> = {}
  for (const payment of paymentList) {
    const weekKey = getPaymentWeekKey(userId, payment)
    if (weekKey in paymentsByWeek) {
      paymentsByWeek[weekKey].push(payment)
    } else {
      paymentsByWeek[weekKey] = [payment]
    }
  }

  await Promise.all(
    Object.keys(paymentsByWeek).map(async key =>
      await redis.set(key, JSON.stringify(paymentsByWeek[key]))
    )
  )
}
