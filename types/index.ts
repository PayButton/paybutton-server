import { Decimal } from '@prisma/client/runtime'
import moment from 'moment'

export interface Paybutton {
  id: string
  userId: string
  addresses: any
}

export interface Network {
  id: string
  slug: string
  title: string
}

export interface TransactionFileData {
  amount: Decimal
  date: moment.Moment
  value: number
  rate: number
  paybuttonName: string
  transactionId: string
}

export interface FormattedTransactionFileData {
  amount: string
  date: string
  value: string
  rate: string
  paybuttonName: string
  transactionId: string
}
