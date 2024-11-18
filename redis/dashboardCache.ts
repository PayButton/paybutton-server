import { redis } from './clientInstance'
import { getCachedWeekKeysForUser, getPaymentsForWeekKey, getPaymentStream } from 'redis/paymentCache'
import { ChartData, DashboardData, Payment, ButtonData, PaymentDataByButton, ChartColor } from './types'
import { Prisma } from '@prisma/client'
import moment, { DurationInputArg2 } from 'moment'
import { XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'
import { QuoteValues } from 'services/priceService'

// USERID:dashboard
const getDashboardSummaryKey = (userId: string): string => {
  return `${userId}:dashboard`
}

const getChartLabels = function (n: number, periodString: string, formatString = 'M/D'): string[] {
  return [...new Array(n)].map((_, idx) => moment().startOf('day').subtract(idx, periodString as DurationInputArg2).format(formatString)).reverse()
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

function getOldestDateKey (keys: string[]): string {
  const keyDatePairs = keys.map(k => [k, k.split(':').slice(-2).map(Number)] as [string, [number, number]])
  keyDatePairs.sort((a, b) => {
    const [aYear, aWeek] = a[1]
    const [bYear, bWeek] = b[1]

    // compare year first, then week
    return (aYear !== bYear ? aYear - bYear : aWeek - bWeek)
  })
  return keyDatePairs[0][0]
}

const getNumberOfMonths = async function (userId: string): Promise<number> {
  const weekKeys = await getCachedWeekKeysForUser(userId)
  if (weekKeys.length === 0) return 0
  const oldestKey = getOldestDateKey(weekKeys)
  const oldestPayments = await getPaymentsForWeekKey(oldestKey)
  const oldestTimestamp = Math.min(...oldestPayments.map(p => p.timestamp))
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
    ret.cad = ret.cad.plus(p.values.cad)
  }
  return ret
}

const generateDashboardDataFromStream = async function (
  paymentStream: AsyncGenerator<Payment>,
  nMonthsTotal: number,
  borderColor: ChartColor
): Promise<DashboardData> {
  // Initialize accumulators for each period
  const revenueAccumulators = {
    thirtyDays: { usd: new Prisma.Decimal(0), cad: new Prisma.Decimal(0) },
    sevenDays: { usd: new Prisma.Decimal(0), cad: new Prisma.Decimal(0) },
    year: { usd: new Prisma.Decimal(0), cad: new Prisma.Decimal(0) },
    all: { usd: new Prisma.Decimal(0), cad: new Prisma.Decimal(0) }
  }
  const paymentCounters = {
    thirtyDays: 0,
    sevenDays: 0,
    year: 0,
    all: 0
  }

  const buttonPaymentData: PaymentDataByButton = {}

  // Define thresholds for each period
  const thresholds = {
    thirtyDays: moment().startOf('day').subtract(30, 'days'),
    sevenDays: moment().startOf('day').subtract(7, 'days'),
    year: moment().startOf('day').subtract(12, 'months'),
    all: moment().startOf('day').subtract(nMonthsTotal, 'months')
  }

  // Process payments incrementally
  for await (const payment of paymentStream) {
    const paymentTime = moment(payment.timestamp * 1000)

    // Accumulate button data
    payment.buttonDisplayDataList.forEach((button) => {
      if (buttonPaymentData[button.id] === undefined) {
        buttonPaymentData[button.id] = {
          displayData: {
            ...button,
            isXec: payment.networkId === XEC_NETWORK_ID,
            isBch: payment.networkId === BCH_NETWORK_ID,
            lastPayment: payment.timestamp
          },
          total: {
            revenue: payment.values,
            payments: 1
          }
        }
      } else {
        const buttonData = buttonPaymentData[button.id]
        buttonData.total.revenue = sumQuoteValues(buttonData.total.revenue, payment.values)
        buttonData.total.payments += 1
        buttonData.displayData.lastPayment = Math.max(buttonData.displayData.lastPayment ?? 0, payment.timestamp)
      }
    })

    // Accumulate period data
    if (paymentTime.isAfter(thresholds.thirtyDays)) {
      revenueAccumulators.thirtyDays = sumQuoteValues(revenueAccumulators.thirtyDays, payment.values)
      paymentCounters.thirtyDays += 1
    }
    if (paymentTime.isAfter(thresholds.sevenDays)) {
      revenueAccumulators.sevenDays = sumQuoteValues(revenueAccumulators.sevenDays, payment.values)
      paymentCounters.sevenDays += 1
    }
    if (paymentTime.isAfter(thresholds.year)) {
      revenueAccumulators.year = sumQuoteValues(revenueAccumulators.year, payment.values)
      paymentCounters.year += 1
    }
    if (paymentTime.isAfter(thresholds.all)) {
      revenueAccumulators.all = sumQuoteValues(revenueAccumulators.all, payment.values)
      paymentCounters.all += 1
    }
  }

  // Generate PeriodData for each period
  const thirtyDays: PeriodData = {
    revenue: getChartData(30, 'days', Array(30).fill(revenueAccumulators.thirtyDays), borderColor.revenue),
    payments: getChartData(30, 'days', Array(30).fill(paymentCounters.thirtyDays), borderColor.payments),
    totalRevenue: revenueAccumulators.thirtyDays,
    totalPayments: paymentCounters.thirtyDays,
    buttons: buttonPaymentData
  }

  const sevenDays: PeriodData = {
    revenue: getChartData(7, 'days', Array(7).fill(revenueAccumulators.sevenDays), borderColor.revenue),
    payments: getChartData(7, 'days', Array(7).fill(paymentCounters.sevenDays), borderColor.payments),
    totalRevenue: revenueAccumulators.sevenDays,
    totalPayments: paymentCounters.sevenDays,
    buttons: buttonPaymentData
  }

  const year: PeriodData = {
    revenue: getChartData(12, 'months', Array(12).fill(revenueAccumulators.year), borderColor.revenue, 'MMM'),
    payments: getChartData(12, 'months', Array(12).fill(paymentCounters.year), borderColor.payments, 'MMM'),
    totalRevenue: revenueAccumulators.year,
    totalPayments: paymentCounters.year,
    buttons: buttonPaymentData
  }

  const all: PeriodData = {
    revenue: getChartData(nMonthsTotal, 'months', Array(nMonthsTotal).fill(revenueAccumulators.all), borderColor.revenue, 'MMM YYYY'),
    payments: getChartData(nMonthsTotal, 'months', Array(nMonthsTotal).fill(paymentCounters.all), borderColor.payments, 'MMM YYYY'),
    totalRevenue: revenueAccumulators.all,
    totalPayments: paymentCounters.all,
    buttons: buttonPaymentData
  }

  return {
    thirtyDays,
    sevenDays,
    year,
    all,
    total: {
      revenue: revenueAccumulators.all,
      payments: paymentCounters.all,
      buttons: Object.keys(buttonPaymentData).length
    }
  }
}

export const getUserDashboardData = async function (userId: string): Promise<DashboardData> {
  const dashboardData = await getCachedDashboardData(userId)
  if (dashboardData === null) {
    const nMonthsTotal = await getNumberOfMonths(userId)
    const paymentStream = getPaymentStream(userId)

    const dashboardData = await generateDashboardDataFromStream(
      paymentStream,
      nMonthsTotal,
      { revenue: '#66fe91', payments: '#669cfe' }
    )
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
