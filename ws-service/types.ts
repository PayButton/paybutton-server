import { Prisma } from '@prisma/client'
import { TransactionWithAddressAndPrices } from 'services/transactionService'

type TxBroadcastType = 'NewTx' | 'OldTx'

export interface BroadcastTxData {
  address: string
  txs: Array<TransactionWithAddressAndPrices | SimplifiedTransaction>
  messageType: TxBroadcastType
}

export interface SimplifiedTransaction {
  hash: string
  amount: Prisma.Decimal
  paymentId?: string
  confirmed?: boolean
  message?: string
  opReturn?: any
  address?: any
  timestamp?: any
}
