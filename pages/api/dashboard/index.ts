import * as paybuttonsService from 'services/paybuttonsService'
import * as addressesService from 'services/addressesService'
import { Prisma, Transaction } from '@prisma/client'
import moment, { DurationInputArg2 } from 'moment'

const DUMMY_XEC_PRICE = 0.00003918
const DUMMY_BCH_PRICE = 132

interface ChartData {
  labels: string[]
  datasets: [
    {
      data: number[] | Prisma.Decimal[]
      borderColor: string
    }
  ]
}

interface PeriodData {
  revenue: ChartData
  payments: ChartData
  totalRevenue: Prisma.Decimal
  totalPayments: number
}

interface DashboardData {
  thirtyDays: PeriodData
  year: PeriodData
  sevenDays: PeriodData
  total: {
    revenue: Prisma.Decimal
    payments: number
    buttons: number
  }
}

const getChartLabels = function (n: number, periodString: string, formatString = 'M/D'): string[] {
  return [...new Array(n)].map((i, idx) => moment().startOf('day').subtract(idx, periodString as DurationInputArg2).format(formatString))
}

const getChartRevenuePaymentData = function (n: number, periodString: string, transactions: Transaction[]): any {
  const revenueArray: Prisma.Decimal[] = []
  const paymentsArray: number[] = []
  const _ = [...new Array(n)]
  _.forEach((i, idx) => {
    const lowerThreshold = moment().startOf('day').subtract(idx + 1, periodString as DurationInputArg2)
    const upperThreshold = moment().startOf('day').subtract(idx, periodString as DurationInputArg2)
    const periodTransactionAmountArray = filterLastTransactions(lowerThreshold, upperThreshold, transactions).map((t) => t.amount)
    const revenue = periodTransactionAmountArray.reduce((a, b) => {
      return a.plus(b)
    }, new Prisma.Decimal(0))
    const paymentCount = periodTransactionAmountArray.length
    revenueArray.push(revenue)
    paymentsArray.push(paymentCount)
  })
  return {
    revenue: revenueArray,
    payments: paymentsArray
  }
}

const filterLastTransactions = function (lowerThreshold: moment.Moment, upperThreshold: moment.Moment, transactions: Transaction[]): Transaction[] {
  return transactions.filter((t) => {
    const tMoment = moment(t.timestamp * 1000)
    return lowerThreshold < tMoment && tMoment < upperThreshold
  })
}

const getChartData = function (n: number, periodString: string, dataArray: number[] | Prisma.Decimal[], borderColor: string, formatString = 'M/D'): ChartData {
  return {
    labels: getChartLabels(n, periodString, formatString),
    datasets: [
      {
        data: dataArray,
        borderColor
      }
    ]
  }
}

const getPeriodData = function (n: number, periodString: string, transactions: Transaction[], borderColor: string, formatString = 'M/D'): PeriodData {
  const revenuePaymentData = getChartRevenuePaymentData(n, periodString, transactions)
  const revenue = getChartData(n, periodString, revenuePaymentData.revenue, borderColor, formatString)
  const payments = getChartData(n, periodString, revenuePaymentData.payments, borderColor, formatString)

  return {
    revenue,
    payments,
    totalRevenue: (revenue.datasets[0].data as any).reduce((a: Prisma.Decimal, b: Prisma.Decimal) => a.plus(b)),
    totalPayments: (payments.datasets[0].data as any).reduce((a: number, b: number) => a + b)
  }
}

const getUserDashboardData = async function (userId: string): Promise<DashboardData> {
  const buttonsCount = (await paybuttonsService.fetchPaybuttonArrayByUserId(userId)).length
  const addresses = await addressesService.fetchAllUserAddresses(userId, true)
  const XECAddresses = addresses.filter((addr) => addr.id === 1)
  const BCHAddresses = addresses.filter((addr) => addr.id === 2)
  const BCHTransactions = Array.prototype.concat.apply([], BCHAddresses.map((addr) => addr.transactions))
  const XECTransactions = Array.prototype.concat.apply([], XECAddresses.map((addr) => addr.transactions))
  const transactionsInUSD = BCHTransactions.map((t) => {
    t.amount = t.amount.times(DUMMY_BCH_PRICE)
    return t
  }).concat(XECTransactions.map((t) => {
    t.amount = t.amount.times(DUMMY_XEC_PRICE)
    return t
  }))

  const totalRevenue = transactionsInUSD.map((t) => t.amount).reduce((a, b) => a.plus(b), new Prisma.Decimal(0))

  const thirtyDays: PeriodData = getPeriodData(30, 'days', transactionsInUSD, '#66fe91')
  const sevenDays: PeriodData = getPeriodData(7, 'days', transactionsInUSD, '#66fe91')
  const year: PeriodData = getPeriodData(12, 'months', transactionsInUSD, '#66fe91', 'MMM')

  return {
    thirtyDays,
    sevenDays,
    year,
    total: {
      revenue: totalRevenue,
      payments: transactionsInUSD.length,
      buttons: buttonsCount
    }
  }
}

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    // await setSession(req, res)
    // let userId = req.session.userId
    const userId = 'dev-uid'

    res.status(200).json(await getUserDashboardData(userId))
  }
}
