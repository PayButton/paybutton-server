import { redis } from './clientInstance'
import { getCachedWeekKeysForUser, getPaymentsForWeekKey, getPaymentStream } from 'redis/paymentCache'
import { ChartData, DashboardData, Payment, ButtonData, PaymentDataByButton, ChartColor, PeriodData, ButtonDisplayData } from './types'
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
  // Initialize accumulators for periods
  const revenueAccumulators = createRevenueAccumulators(nMonthsTotal)
  const paymentCounters = createPaymentCounters(nMonthsTotal)
  const buttonDataAccumulators = createButtonDataAccumulators()

  const today = moment().startOf('day')
  const monthStart = moment().startOf('month')
  const thresholds = createThresholds(today, monthStart, nMonthsTotal)

  // Process all payments
  for await (const payment of paymentStream) {
    const paymentTime = moment(payment.timestamp * 1000)

    // Process button data and assign to relevant periods
    payment.buttonDisplayDataList.forEach((button) => {
      processButtonData(button, payment, paymentTime, buttonDataAccumulators, thresholds)
    })

    // Accumulate period data
    const periods = ['thirtyDays', 'sevenDays', 'year', 'all'] as const
    periods.forEach((period) => {
      if (paymentTime.isSameOrAfter(thresholds[period])) {
        const index =
          period === 'thirtyDays' || period === 'sevenDays'
            ? today.diff(paymentTime, 'days')
            : monthStart.diff(paymentTime, 'months')
        if (index < revenueAccumulators[period].length) {
          revenueAccumulators[period][index] = sumQuoteValues(revenueAccumulators[period][index], payment.values)
          paymentCounters[period][index] += 1
        }
      }
    })
  }

  reverseAccumulators(revenueAccumulators, paymentCounters)

  // Generate PeriodData for each period
  const thirtyDays = createPeriodData(
    30,
    'days',
    revenueAccumulators.thirtyDays,
    paymentCounters.thirtyDays,
    buttonDataAccumulators.thirtyDays,
    borderColor.revenue,
    borderColor.payments
  )

  const sevenDays = createPeriodData(
    7,
    'days',
    revenueAccumulators.sevenDays,
    paymentCounters.sevenDays,
    buttonDataAccumulators.sevenDays,
    borderColor.revenue,
    borderColor.payments
  )

  const year = createPeriodData(
    12,
    'months',
    revenueAccumulators.year,
    paymentCounters.year,
    buttonDataAccumulators.year,
    borderColor.revenue,
    borderColor.payments,
    'MMM'
  )

  const all = createPeriodData(
    nMonthsTotal,
    'months',
    revenueAccumulators.all,
    paymentCounters.all,
    buttonDataAccumulators.all,
    borderColor.revenue,
    borderColor.payments,
    'MMM YYYY'
  )

  return {
    thirtyDays,
    sevenDays,
    year,
    all,
    total: {
      revenue: all.totalRevenue,
      payments: all.totalPayments,
      buttons: Object.keys(buttonDataAccumulators.all).length
    }
  }
}

interface PeriodRevenueAccumulators {
  thirtyDays: QuoteValues[]
  sevenDays: QuoteValues[]
  year: QuoteValues[]
  all: QuoteValues[]
}

function createRevenueAccumulators (nMonthsTotal: number): PeriodRevenueAccumulators {
  return {
    thirtyDays: Array(30).fill({ usd: new Prisma.Decimal(0), cad: new Prisma.Decimal(0) }),
    sevenDays: Array(7).fill({ usd: new Prisma.Decimal(0), cad: new Prisma.Decimal(0) }),
    year: Array(12).fill({ usd: new Prisma.Decimal(0), cad: new Prisma.Decimal(0) }),
    all: Array(nMonthsTotal).fill({ usd: new Prisma.Decimal(0), cad: new Prisma.Decimal(0) })
  }
}

interface PeriodPaymentCounters {
  thirtyDays: number[]
  sevenDays: number[]
  year: number[]
  all: number[]
}

function createPaymentCounters (nMonthsTotal: number): PeriodPaymentCounters {
  return {
    thirtyDays: Array(30).fill(0),
    sevenDays: Array(7).fill(0),
    year: Array(12).fill(0),
    all: Array(nMonthsTotal).fill(0)
  }
}

interface PeriodButtonDataAccumulators {
  thirtyDays: PaymentDataByButton
  sevenDays: PaymentDataByButton
  year: PaymentDataByButton
  all: PaymentDataByButton
}

function createButtonDataAccumulators (): PeriodButtonDataAccumulators {
  return {
    thirtyDays: {},
    sevenDays: {},
    year: {},
    all: {}
  }
}

interface PeriodThresholds {
  thirtyDays: moment.Moment
  sevenDays: moment.Moment
  year: moment.Moment
  all: moment.Moment
}

function createThresholds (today: moment.Moment, monthStart: moment.Moment, nMonthsTotal: number): PeriodThresholds {
  return {
    thirtyDays: today.clone().subtract(30, 'days'),
    sevenDays: today.clone().subtract(7, 'days'),
    year: monthStart.clone().subtract(12, 'months'),
    all: monthStart.clone().subtract(nMonthsTotal, 'months')
  }
}

function processButtonData (
  button: ButtonDisplayData,
  payment: Payment,
  paymentTime: moment.Moment,
  buttonDataAccumulators: ReturnType<typeof createButtonDataAccumulators>,
  thresholds: ReturnType<typeof createThresholds>
): void {
  const periods = ['thirtyDays', 'sevenDays', 'year', 'all'] as const
  periods.forEach((period) => {
    if (paymentTime.isSameOrAfter(thresholds[period])) {
      if (buttonDataAccumulators[period][button.id] === undefined) {
        buttonDataAccumulators[period][button.id] = {
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
        const buttonData = buttonDataAccumulators[period][button.id]
        buttonData.total.revenue = sumQuoteValues(buttonData.total.revenue, payment.values)
        buttonData.total.payments += 1
        buttonData.displayData.lastPayment = Math.max(
          buttonData.displayData.lastPayment ?? 0,
          payment.timestamp
        )
      }
    }
  })
}

function reverseAccumulators (
  revenueAccumulators: ReturnType<typeof createRevenueAccumulators>,
  paymentCounters: ReturnType<typeof createPaymentCounters>
): void {
  Object.keys(revenueAccumulators).forEach((key) => {
    revenueAccumulators[key as keyof typeof revenueAccumulators].reverse()
    paymentCounters[key as keyof typeof paymentCounters].reverse()
  })
}

function createPeriodData (
  periodLength: number,
  periodUnit: string,
  revenueData: QuoteValues[],
  paymentData: number[],
  buttonData: PaymentDataByButton,
  revenueColor: string,
  paymentColor: string,
  labelFormat = 'M/D'
): PeriodData {
  return {
    revenue: getChartData(periodLength, periodUnit, revenueData, revenueColor, labelFormat),
    payments: getChartData(periodLength, periodUnit, paymentData, paymentColor, labelFormat),
    totalRevenue: revenueData.reduce(sumQuoteValues, { usd: new Prisma.Decimal(0), cad: new Prisma.Decimal(0) }),
    totalPayments: paymentData.reduce((a, b) => a + b, 0),
    buttons: buttonData
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
