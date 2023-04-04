import { redis } from 'redis/clientInstance'
import { Prisma } from '@prisma/client'
import { PAYMENT_WEEK_KEY_FORMAT, KeyValueT } from 'constants/index'
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

const getPaymentWeekKey = (payment: Payment): string => {
  return moment.unix(payment.timestamp).format(PAYMENT_WEEK_KEY_FORMAT)
}

export const getPaymentsByWeek = (paymentList: Payment[]): KeyValueT<Payment[]> => {
  const paymentsByWeek: KeyValueT<Payment[]> = {}
  for (const payment of paymentList) {
    const weekKey = getPaymentWeekKey(payment)
    if (weekKey in paymentsByWeek) {
      paymentsByWeek[weekKey].push(payment)
    } else {
      paymentsByWeek[weekKey] = [payment]
    }
  }
  return paymentsByWeek
}

export const cachePaymentsByWeek = async (paymentsByWeek: KeyValueT<Payment[]>): Promise<void> => {
  await Promise.all(
    Object.keys(paymentsByWeek).map(async key =>
      await redis.set(key, JSON.stringify(paymentsByWeek[key]))
    )
  )
}
