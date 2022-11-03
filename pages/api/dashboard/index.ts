import * as paybuttonService from 'services/paybuttonService'
import * as addressService from 'services/addressService'
import * as transactionService from 'services/transactionService'
import * as priceService from 'services/priceService'
import { XEC_NETWORK_ID, BCH_NETWORK_ID, USD_QUOTE_ID } from 'constants/index'
import { Prisma, Transaction } from '@prisma/client'
import moment, { DurationInputArg2 } from 'moment'
import { setSession } from 'utils/setSession'

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

interface AllMonths {
  months: number
}

interface DashboardData {
  thirtyDays: PeriodData
  year: PeriodData
  sevenDays: PeriodData
  all: PeriodData
  total: {
    revenue: Prisma.Decimal
    payments: number
    buttons: number
  }
}

const getChartLabels = function (n: number, periodString: string, formatString = 'M/D'): string[] {
  return [...new Array(n)].map((i, idx) => moment().startOf('day').subtract(idx, periodString as DurationInputArg2).format(formatString)).reverse()
}

const getChartRevenuePaymentData = function (n: number, periodString: string, transactions: Transaction[]): any {
  const revenueArray: Prisma.Decimal[] = []
  const paymentsArray: number[] = []
  const _ = [...new Array(n)]
  _.forEach((i, idx) => {
    const lowerThreshold = moment().startOf(periodString === 'months' ? 'month' : 'day').subtract(idx, periodString as DurationInputArg2)
    const upperThreshold = moment().endOf(periodString === 'months' ? 'month' : 'day').subtract(idx, periodString as DurationInputArg2)
    const periodTransactionAmountArray = filterLastTransactions(lowerThreshold, upperThreshold, transactions).map((t) => t.amount)
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

interface ChartColor {
  revenue: string
  payments: string
}

const getPeriodData = function (n: number, periodString: string, transactions: Transaction[], borderColor: ChartColor, formatString = 'M/D'): PeriodData {
  const revenuePaymentData = getChartRevenuePaymentData(n, periodString, transactions)
  const revenue = getChartData(n, periodString, revenuePaymentData.revenue, borderColor.revenue, formatString)
  const payments = getChartData(n, periodString, revenuePaymentData.payments, borderColor.payments, formatString)

  return {
    revenue,
    payments,
    totalRevenue: (revenue.datasets[0].data as any).reduce((a: Prisma.Decimal, b: Prisma.Decimal) => a.plus(b), new Prisma.Decimal(0)),
    totalPayments: (payments.datasets[0].data as any).reduce((a: number, b: number) => a + b, 0)
  }
}

const getAllMonths = function (transactions: any[]): AllMonths {
  const oldestdate = transactions.reduce(
    (prev, cur) => (prev?.timestamp < cur.timestamp ? prev : cur),
    { timestamp: Date.now() / 1000 }
  )
  const currentDate = Date.now() / 1000
  const diff = currentDate - oldestdate.timestamp
  const min = diff / 60
  const hours = min / 60
  const days = hours / 24
  const months = Math.ceil(days / 30)
  return { months }
}

const getUserDashboardData = async function (userId: string): Promise<DashboardData> {
  const buttonsCount = (await paybuttonService.fetchPaybuttonArrayByUserId(userId)).length
  const addresses = await addressService.fetchAllUserAddresses(userId, true)
  const XECAddressIds = addresses.filter((addr) => addr.networkId === XEC_NETWORK_ID).map((addr) => addr.id)
  const BCHAddressIds = addresses.filter((addr) => addr.networkId === BCH_NETWORK_ID).map((addr) => addr.id)
  const XECTransactions = await transactionService.fetchAddressListTransactions(XECAddressIds)
  const BCHTransactions = await transactionService.fetchAddressListTransactions(BCHAddressIds)
  const prices = await priceService.getCurrentPrices()
  const BCHPrice = prices.filter((price) => price.quoteId === USD_QUOTE_ID && price.networkId === BCH_NETWORK_ID)[0].value
  const XECPrice = prices.filter((price) => price.quoteId === USD_QUOTE_ID && price.networkId === XEC_NETWORK_ID)[0].value

  const incomingTransactionsValue = BCHTransactions.map((t) => {
    t.amount = t.amount.times(BCHPrice)
    return t
  }).concat(XECTransactions.map((t) => {
    t.amount = t.amount.times(XECPrice)
    return t
  })).filter((t) => {
    return t.amount > 0
  })

  const totalRevenue = incomingTransactionsValue.map((t) => t.amount).reduce((a, b) => a.plus(b), new Prisma.Decimal(0))
  const allmonths: AllMonths = getAllMonths(incomingTransactionsValue)

  const thirtyDays: PeriodData = getPeriodData(30, 'days', incomingTransactionsValue, { revenue: '#66fe91', payments: '#669cfe' })
  const sevenDays: PeriodData = getPeriodData(7, 'days', incomingTransactionsValue, { revenue: '#66fe91', payments: '#669cfe' })
  const year: PeriodData = getPeriodData(12, 'months', incomingTransactionsValue, { revenue: '#66fe91', payments: '#669cfe' }, 'MMM')
  const all: PeriodData = getPeriodData(allmonths.months, 'months', incomingTransactionsValue, { revenue: '#66fe91', payments: '#669cfe' }, 'MMM YYYY')

  return {
    thirtyDays,
    sevenDays,
    year,
    all,
    total: {
      revenue: totalRevenue,
      payments: incomingTransactionsValue.length,
      buttons: buttonsCount
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
