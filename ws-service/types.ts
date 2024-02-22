import { Address, Prisma } from '@prisma/client'
import { OpReturnData } from 'utils/validators'

type TxBroadcastType = 'NewTx' | 'OldTx'

export interface BroadcastTxData {
  address: string
  txs: SimplifiedTransaction[]
  messageType: TxBroadcastType
}

export interface SimplifiedTransaction {
  hash: string
  amount: Prisma.Decimal
  paymentId?: string
  confirmed?: boolean
  message: string
  opReturn?: OpReturnData
  timestamp: number
  address: Address
}
