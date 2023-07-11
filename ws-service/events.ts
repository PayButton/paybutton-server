import config from '../config/index'
import { TransactionWithAddressAndPrices } from 'services/transactionService'
import { RESPONSE_MESSAGES } from '../constants/index'
import { Socket } from 'socket.io'
import io from 'socket.io-client'

// client for server(next) functions to emit events to
// websocket server.
const serverClient = io(`${config.wsBaseURL}/addresses`, { })

export interface ISocket extends Socket {
  data: {
    addresses: string[]
  }
}

type TxBroadcast = 'NewTx' | 'OldTx'
export interface BroadcastTxData {
  address: string
  txs: TransactionWithAddressAndPrices[]
  messageType: TxBroadcast
}

// Server(WS)-side
export function onBroadcastTxData (socket: Socket): (...args: any[]) => void {
  return (key: string, broadcastTxData: BroadcastTxData): void => {
    if (key !== process.env.WS_AUTH_KEY) {
      console.error(RESPONSE_MESSAGES.UNAUTHORIZED_403)
      return
    }

    if (broadcastTxData?.txs?.length === 0) {
      console.error(RESPONSE_MESSAGES.BROADCAST_EMPTY_TX_400)
      return
    }
    socket.to(broadcastTxData.address).emit('new-tx', broadcastTxData)
  }
}

// Client(NextServer)-side
export const broadcastTxInsertion = (broadcastTxData: BroadcastTxData): void => {
  serverClient.emit('broadcast-new-tx', process.env.WS_AUTH_KEY, broadcastTxData)
}
