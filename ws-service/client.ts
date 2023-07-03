import config from '../config/index'
import { TransactionWithAddressAndPrices } from 'services/transactionService'

type TxBroadcast = 'NewTx' | 'OldTx'
export interface BroadcastTxData {
  address: string
  txs: TransactionWithAddressAndPrices[]
  messageType: TxBroadcast
}

export async function broadcastTxInsertion (insertedTxs: BroadcastTxData): Promise<Response> {
  return await fetch(`${config.wsBaseURL}/broadcast-new-tx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Key': config.wsAuthKey ?? ''
    },
    body: JSON.stringify({ insertedTxs })
  })
}
