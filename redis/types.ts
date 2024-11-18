import { QuoteValues } from 'services/priceService'

export interface ChartColor {
  revenue: string
  payments: string
}

export interface ChartData {
  isMultiQuote: boolean
  labels: string[]
  datasets: [
    {
      data: number[] | QuoteValues[]
      borderColor: string
    }
  ]
}

export interface PeriodData {
  revenue: ChartData
  payments: ChartData
  totalRevenue: QuoteValues
  totalPayments: number
  buttons: PaymentDataByButton
}

export interface DashboardData {
  thirtyDays: PeriodData
  year: PeriodData
  sevenDays: PeriodData
  all: PeriodData
  total: {
    revenue: QuoteValues
    payments: number
    buttons: number
  }
}

export interface ButtonDisplayData {
  name: string
  id: string
  isXec?: boolean
  isBch?: boolean
  lastPayment?: number
}

export interface Payment {
  timestamp: number
  values: QuoteValues
  networkId: number
  hash: string
  buttonDisplayDataList: ButtonDisplayData[]
}

export interface ButtonData {
  displayData: ButtonDisplayData
  total: {
    revenue: QuoteValues
    payments: number
  }
}

export interface PaymentDataByButton {
  [id: string]: ButtonData
}
