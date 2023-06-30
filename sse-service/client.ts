import config from 'config'
import { KeyValueT } from 'constants/index'
import { TransactionWithAddressAndPrices } from 'services/transactionService'

export type BroadcastTxData = KeyValueT<TransactionWithAddressAndPrices[]>

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
