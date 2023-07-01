import config from '../config/index'
import { TransactionWithAddressAndPrices } from 'services/transactionService'

export interface BroadcastTxData {
  address: string
  txs: TransactionWithAddressAndPrices[]
}

export async function broadcastTxInsertion (insertedTxs: BroadcastTxData): Promise<Response> {
  return await fetch(`${config.sseBaseURL}/broadcast-new-tx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Key': config.sseAuthKey ?? ''
    },
    body: JSON.stringify({ insertedTxs })
  })
}
