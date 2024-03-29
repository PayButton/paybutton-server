import { Prisma } from '@prisma/client'

type TxBroadcastType = 'NewTx' | 'OldTx'

export interface BroadcastTxData {
  address: string
  txs: SimplifiedTransaction[]
  messageType: TxBroadcastType
}

export interface SimplifiedTransaction {
  hash: string
  amount: Prisma.Decimal
  paymentId: string
  confirmed?: boolean
  message: string
  timestamp: number
  address: string
}
