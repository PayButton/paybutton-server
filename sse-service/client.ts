import { appInfo } from '../config/appInfo'
import { KeyValueT } from 'constants/index'
import { TransactionWithAddressAndPrices } from 'services/transactionService'

export type BroadcastTxData = KeyValueT<TransactionWithAddressAndPrices[]>

export async function broadcastTxInsertion (insertedTxs: BroadcastTxData): Promise<Response> {
  return await fetch(`${appInfo.sseBaseURL}/broadcast-new-tx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Key': process.env.SSE_AUTH_KEY ?? ''
    },
    body: JSON.stringify({ insertedTxs })
  })
}
