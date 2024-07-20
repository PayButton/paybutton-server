import { Decimal } from '@prisma/client/runtime'

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
