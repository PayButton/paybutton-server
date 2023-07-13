import * as paybuttonService from 'services/paybuttonService'
import { Prisma } from '@prisma/client'
import moment, { DurationInputArg2 } from 'moment'
import { setSession } from 'utils/setSession'
import { ChartData, PeriodData, DashboardData, Payment, getUserUncachedAddresses, cacheAddress, getCachedPaymentsForUser } from 'redis/dashboardCache'

interface AllMonths {
  months: number
}

const getChartLabels = function (n: number, periodString: string, formatString = 'M/D'): string[] {
  return [...new Array(n)].map((_, idx) => moment().startOf('day').subtract(idx, periodString as DurationInputArg2).format(formatString)).reverse()
}

const getChartRevenuePaymentData = function (n: number, periodString: string, paymentList: Payment[]): any {
  const revenueArray: Prisma.Decimal[] = []
  const paymentsArray: number[] = []
  const _ = [...new Array(n)]
  _.forEach((_, idx) => {
    const lowerThreshold = moment().startOf(periodString === 'months' ? 'month' : 'day').subtract(idx, periodString as DurationInputArg2)
    const upperThreshold = moment().endOf(periodString === 'months' ? 'month' : 'day').subtract(idx, periodString as DurationInputArg2)
    const periodTransactionAmountArray = filterLastPayments(lowerThreshold, upperThreshold, paymentList).map((p) => p.value)
    const revenue = periodTransactionAmountArray.reduce((a, b) => {
      return a.plus(b)
    }, new Prisma.Decimal(0))
    const paymentCount = periodTransactionAmountArray.length
    revenueArray.push(revenue)
    paymentsArray.push(paymentCount)
  })
  return {
    revenue: revenueArray.reverse(),
    payments: paymentsArray.reverse()
  }
}

const filterLastPayments = function (lowerThreshold: moment.Moment, upperThreshold: moment.Moment, paymentList: Payment[]): Payment[] {
  return paymentList.filter((p) => {
    const tMoment = moment(p.timestamp * 1000)
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

interface ChartColor {
  revenue: string
  payments: string
}

const getPeriodData = function (n: number, periodString: string, paymentList: Payment[], borderColor: ChartColor, formatString = 'M/D'): PeriodData {
  const revenuePaymentData = getChartRevenuePaymentData(n, periodString, paymentList)
  const revenue = getChartData(n, periodString, revenuePaymentData.revenue, borderColor.revenue, formatString)
  const payments = getChartData(n, periodString, revenuePaymentData.payments, borderColor.payments, formatString)

  return {
    revenue,
    payments,
    totalRevenue: (revenue.datasets[0].data as any).reduce((a: Prisma.Decimal, b: Prisma.Decimal) => a.plus(b), new Prisma.Decimal(0)),
    totalPayments: (payments.datasets[0].data as any).reduce((a: number, b: number) => a + b, 0)
  }
}

const getAllMonths = function (paymentList: Payment[]): AllMonths {
  const oldestTimestamp = Math.min(...paymentList.map(p => p.timestamp)
  )
  const oldestDate = moment(oldestTimestamp * 1000)
  const today = moment()
  const diff = today.diff(oldestDate, 'months', true)
  const months = Math.ceil(diff) + 1
  return { months }
}

export interface ButtonDisplayData {
  name: string
  id: string
}

const getPaymentList = async (userId: string): Promise<Payment[]> => {
  for (const address of await getUserUncachedAddresses(userId)) {
    void await cacheAddress(address)
  }
  return await getCachedPaymentsForUser(userId)
}

const getUserDashboardData = async function (userId: string): Promise<DashboardData> {
  const buttons = await paybuttonService.fetchPaybuttonArrayByUserId(userId)
  const paymentList = await getPaymentList(userId)

  const totalRevenue = paymentList.map((p) => p.value).reduce((a, b) => a.plus(b), new Prisma.Decimal(0))
  const allmonths: AllMonths = getAllMonths(paymentList)

  const thirtyDays: PeriodData = getPeriodData(30, 'days', paymentList, { revenue: '#66fe91', payments: '#669cfe' })
  const sevenDays: PeriodData = getPeriodData(7, 'days', paymentList, { revenue: '#66fe91', payments: '#669cfe' })
  const year: PeriodData = getPeriodData(12, 'months', paymentList, { revenue: '#66fe91', payments: '#669cfe' }, 'MMM')
  const all: PeriodData = getPeriodData(allmonths.months, 'months', paymentList, { revenue: '#66fe91', payments: '#669cfe' }, 'MMM YYYY')

  return {
    thirtyDays,
    sevenDays,
    year,
    all,
    paymentList,
    total: {
      revenue: totalRevenue,
      payments: paymentList.length,
      buttons: buttons.length
    }
  }
}

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    await setSession(req, res)
    const userId = req.session.userId

    res.status(200).json(await getUserDashboardData(userId))
  }
}
