import { Prisma } from '@prisma/client'

export interface ChartColor {
  revenue: string
  payments: string
}

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
  buttons: PaymentDataByButton
}

export interface DashboardData {
  thirtyDays: PeriodData
  year: PeriodData
  sevenDays: PeriodData
  all: PeriodData
  paymentList?: Payment[]
  total: {
    revenue: Prisma.Decimal
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
  value: Prisma.Decimal
  networkId: number
  hash: string
  buttonDisplayDataList: ButtonDisplayData[]
}

export interface ButtonData {
  displayData: ButtonDisplayData
  total: {
    revenue: Prisma.Decimal
    payments: number
  }
}

export interface PaymentDataByButton {
  [id: string]: ButtonData
}
