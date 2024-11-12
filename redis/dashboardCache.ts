import { redis } from './clientInstance'
import { getPaymentList } from 'redis/paymentCache'
import { ChartData, PeriodData, DashboardData, Payment, ButtonData, PaymentDataByButton, ChartColor } from './types'
import { Prisma } from '@prisma/client'
import moment, { DurationInputArg2 } from 'moment'
import { XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'
import { fetchPaybuttonArrayByUserId } from 'services/paybuttonService'
import { QuoteValues } from 'services/priceService'

// USERID:dashboard
const getDashboardSummaryKey = (userId: string): string => {
  return `${userId}:dashboard`
}

const getChartLabels = function (n: number, periodString: string, formatString = 'M/D'): string[] {
  return [...new Array(n)].map((_, idx) => moment().startOf('day').subtract(idx, periodString as DurationInputArg2).format(formatString)).reverse()
}

interface RevenuePaymentData {
  revenue: QuoteValues[]
  payments: number[]
}

const getChartRevenuePaymentData = function (n: number, periodString: string, paymentList: Payment[]): RevenuePaymentData {
  const revenueArray: QuoteValues[] = []
  const paymentsArray: number[] = []
  const _ = [...new Array(n)]
  _.forEach((_, idx) => {
    const lowerThreshold = moment().subtract(idx, periodString as DurationInputArg2).startOf(periodString === 'months' ? 'month' : 'day')
    const upperThreshold = moment().subtract(idx, periodString as DurationInputArg2).endOf(periodString === 'months' ? 'month' : 'day')
    const periodPaymentList = filterLastPayments(lowerThreshold, upperThreshold, paymentList)
    const revenue = sumPaymentsValue(periodPaymentList)
    const paymentCount = periodPaymentList.length
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

const getChartData = function (n: number, periodString: string, dataArray: number[] | QuoteValues[], borderColor: string, formatString = 'M/D'): ChartData {
  let isMultiQuote = false
  if (dataArray.length > 0 && typeof dataArray[0] !== 'number') {
    isMultiQuote = true
  }
  return {
    isMultiQuote,
    labels: getChartLabels(n, periodString, formatString),
    datasets: [
      {
        data: dataArray,
        borderColor
      }
    ]
  }
}

const getPeriodData = function (n: number, periodString: string, paymentList: Payment[], borderColor: ChartColor, formatString = 'M/D'): PeriodData {
  const revenuePaymentData = getChartRevenuePaymentData(n, periodString, paymentList)
  const revenue = getChartData(n, periodString, revenuePaymentData.revenue, borderColor.revenue, formatString)
  const payments = getChartData(n, periodString, revenuePaymentData.payments, borderColor.payments, formatString)
  const buttons = getButtonPaymentData(n, periodString, paymentList)
  const totalRevenue = (revenue.datasets[0].data as QuoteValues[]).reduce(sumQuoteValues, { usd: new Prisma.Decimal(0), cad: new Prisma.Decimal(0) })
  const totalPayments = (payments.datasets[0].data as any).reduce((a: number, b: number) => a + b, 0)

  return {
    revenue,
    payments,
    totalRevenue,
    totalPayments,
    buttons
  }
}

const getNumberOfMonths = function (paymentList: Payment[]): number {
  if (paymentList.length === 0) return 0
  const oldestTimestamp = Math.min(...paymentList.map(p => p.timestamp)
  )
  const oldestDate = moment(oldestTimestamp * 1000)
  const today = moment()
  const floatDiff = today.diff(oldestDate, 'months', true)
  return Math.ceil(floatDiff) + 1
}

export const getButtonPaymentData = (n: number, periodString: string, paymentList: Payment[]): PaymentDataByButton => {
  const buttonPaymentData: PaymentDataByButton = {}
  const lowerThreshold = moment().startOf('day').subtract(n, periodString as DurationInputArg2)
  const upperThreshold = moment().endOf('day')
  const periodPaymentList = filterLastPayments(lowerThreshold, upperThreshold, paymentList)

  for (const p of periodPaymentList) {
    p.buttonDisplayDataList.forEach(b => {
      const prev = Object.keys(buttonPaymentData).find(r => buttonPaymentData[r].displayData.id === b.id)
      const prevObj = prev !== undefined ? buttonPaymentData[prev] : undefined
      if (prevObj === undefined) {
        const newEntry: ButtonData = {
          displayData: {
            ...b,
            isXec: p.networkId === XEC_NETWORK_ID,
            isBch: p.networkId === BCH_NETWORK_ID,
            lastPayment: p.timestamp
          },
          total: {
            payments: 1,
            revenue: p.values
          }
        }
        buttonPaymentData[b.id] = newEntry
        return
      }
      prevObj.total.payments += 1
      prevObj.total.revenue = sumQuoteValues(prevObj.total.revenue, p.values)
      prevObj.displayData.isXec = prevObj.displayData.isXec === true || (p.networkId === XEC_NETWORK_ID)
      prevObj.displayData.isBch = prevObj.displayData.isBch === true || (p.networkId === BCH_NETWORK_ID)
      const lastPayment = prevObj.displayData.lastPayment as number
      prevObj.displayData.lastPayment = lastPayment < p.timestamp ? p.timestamp : lastPayment
    })
  }
  return buttonPaymentData
}
export const sumQuoteValues = function (a: QuoteValues, b: QuoteValues): QuoteValues {
  return {
    usd: (new Prisma.Decimal(a.usd)).plus(new Prisma.Decimal(b.usd)),
    cad: (new Prisma.Decimal(a.cad)).plus(new Prisma.Decimal(b.cad))
  }
}

export const sumPaymentsValue = function (paymentList: Payment[]): QuoteValues {
  const ret: QuoteValues = {
    usd: new Prisma.Decimal(0),
    cad: new Prisma.Decimal(0)
  }

  for (const p of paymentList) {
    ret.usd = ret.usd.plus(p.values.usd)
    ret.cad = ret.usd.plus(p.values.cad)
  }
  return ret
}

export const getUserDashboardData = async function (userId: string): Promise<DashboardData> {
  let dashboardData = await getCachedDashboardData(userId)
  if (dashboardData === null) {
    const buttons = await fetchPaybuttonArrayByUserId(userId)
    const paymentList = await getPaymentList(userId)

    const totalRevenue = sumPaymentsValue(paymentList)
    const nMonthsTotal = getNumberOfMonths(paymentList)

    const thirtyDays: PeriodData = getPeriodData(30, 'days', paymentList, { revenue: '#66fe91', payments: '#669cfe' })
    const sevenDays: PeriodData = getPeriodData(7, 'days', paymentList, { revenue: '#66fe91', payments: '#669cfe' })
    const year: PeriodData = getPeriodData(12, 'months', paymentList, { revenue: '#66fe91', payments: '#669cfe' }, 'MMM')
    const all: PeriodData = getPeriodData(nMonthsTotal, 'months', paymentList, { revenue: '#66fe91', payments: '#669cfe' }, 'MMM YYYY')

    dashboardData = {
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
    await cacheDashboardData(userId, dashboardData) // WIP SET THIS NULL ON UPDATE BUTTONS & WS
    return dashboardData
  }
  return dashboardData
}

export const cacheDashboardData = async (userId: string, dashboardData: DashboardData): Promise<void> => {
  const key = getDashboardSummaryKey(userId)
  const {
    paymentList,
    ...cachable
  } = dashboardData
  await redis.set(key, JSON.stringify(cachable))
}

export const getCachedDashboardData = async (userId: string): Promise<DashboardData | null> => {
  const key = getDashboardSummaryKey(userId)
  const dashboardString = await redis.get(key)
  const dashboardData: DashboardData | null = (dashboardString === null) ? null : JSON.parse(dashboardString)
  return dashboardData
}

export const clearDashboardCache = async (userId: string): Promise<void> => {
  const key = getDashboardSummaryKey(userId)
  await redis.del(key, () => {})
}
