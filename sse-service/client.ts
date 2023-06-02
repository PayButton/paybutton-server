import { KeyValueT } from 'constants/index'
import { TransactionWithAddressAndPrices } from 'services/transactionService'

export type BroadcastTxData = KeyValueT<TransactionWithAddressAndPrices[]>

export async function broadcastTxInsertion (insertedTxs: BroadcastTxData): Promise<Response> {
  return await fetch('http://localhost:5000/broadcast-new-tx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Key': process.env.SSE_AUTH_KEY ?? ''
    },
    body: JSON.stringify({ insertedTxs })
  })
}
