import { TransactionWithAddressAndPrices } from 'services/transactionService'

type TxBroadcast = 'NewTx' | 'OldTx'
export interface BroadcastTxData {
  address: string
  txs: TransactionWithAddressAndPrices[]
  messageType: TxBroadcast
}

export type TxEmitEvent = 'txs-broadcast' | 'incoming-txs'
