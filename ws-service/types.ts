import { TransactionWithAddressAndPrices } from 'services/transactionService'

type TxBroadcast = 'NewTx' | 'OldTx'

export interface BroadcastTxData {
  address: string
  txs: TransactionWithAddressAndPrices[]
  messageType: TxBroadcast
}
export interface BroadcastTransactionPayload {
  address: string
  transactions: Transaction[]
  messageType: TxBroadcast
}

export interface Transaction {
  hash: string;
  amount: string;
  paymentId?: string;
  confirmed?: boolean;
  message?: string;
}