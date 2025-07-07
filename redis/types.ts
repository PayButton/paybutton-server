import { Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
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
  filtered: boolean
}

export interface ButtonDisplayData {
  name: string
  id: string
  isXec?: boolean
  isBch?: boolean
  lastPayment?: number
  providerUserId?: string
}

export interface InvoiceData {
  id?: string
  invoiceNumber: string
  amount: Prisma.Decimal
  recipientName: string
  recipientAddress: string
  description: string
  customerName: string
  customerAddress: string
  createdAt?: Date
  transactionHash?: string
  transactionDate?: string
  transactionNetworkId?: number
  userId?: string
}

export interface Payment {
  id?: string
  timestamp: number
  values: QuoteValues
  amount?: Decimal
  networkId: number
  hash: string
  buttonDisplayDataList: ButtonDisplayData[]
  address?: string
  invoices?: InvoiceData[]
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
