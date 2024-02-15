import express from 'express'
import cors from 'cors'
import { BroadcastTxData, SimplifiedTransaction } from './types'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import { RESPONSE_MESSAGES } from '../constants/index'

// Configure server
const app = express()
app.use(express.json({ limit: '1mb' }))
app.use(cors())
app.options('/socket.io', cors())
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

// Configure namespaces
const addressesNs = io.of('/addresses')
const addressRouteConnection = (socket: Socket): void => {
  let addresses: string[] = []
  if (typeof socket.handshake.query.addresses === 'string') {
    addresses = socket.handshake.query.addresses.split(',')
  } else if (Array.isArray(socket.handshake.query.addresses)) {
    addresses = socket.handshake.query.addresses
  }
  if (addresses.length === 0) {
    socket.disconnect(true)
    return
  }
  for (const addr of addresses) {
    void socket.join(addr)
  }
  void socket.on('disconnect', () => {
    const countA = io.of('/addresses').sockets.size
    console.log('disc:', addresses)
    console.log('  total:', countA)
  })
  const countA = io.of('/addresses').sockets.size
  console.log('conn:', addresses)
  console.log('  total:', countA)
}

const resolveOpReturn = (opr: any) => {
  try {
    if (typeof opr === 'string' && opr !== '') {
      return JSON.parse(opr)
    }
  } catch (e) {
    return null
  }
}

const broadcastTxs = async (broadcastTxData: BroadcastTxData): Promise<void> => {
  console.log('broadcasting', broadcastTxData.txs.length, broadcastTxData.messageType, 'txs to', broadcastTxData.address)
  try {
    const { address, messageType, txs } = broadcastTxData
    const broadcastedTransactions: BroadcastTxData = {
      txs: [],
      address,
      messageType
    }

    txs.forEach(
      t => {
        const { opReturn, hash, amount, confirmed } = t

        const parsedOpReturn = resolveOpReturn(opReturn)

        const newSimplifiedTransaction: SimplifiedTransaction = {
          hash,
          amount: amount.toString(),
          paymentId: parsedOpReturn?.paymentId,
          confirmed,
          message: parsedOpReturn?.message
        }

        broadcastedTransactions.txs.push(newSimplifiedTransaction)
      })

    if (broadcastedTransactions?.txs?.length === 0) {
      console.warn(RESPONSE_MESSAGES.BROADCAST_EMPTY_TX_400)
      return
    }

    addressesNs.to(address)
      .emit('incoming-txs', broadcastedTransactions)
  } catch (err: any) {
    console.error(RESPONSE_MESSAGES.FAILED_TO_PARSE_TX_OP_RETURN_500.message)
    console.error('Error stack:', err.stack)
  }
}

const broadcastNs = io.of('/broadcast')
const broadcastRouteConnection = (socket: Socket): void => {
  const key = socket.handshake.query.key
  if (key !== process.env.WS_AUTH_KEY) {
    console.error(RESPONSE_MESSAGES.UNAUTHORIZED_403)
    socket.disconnect(true)
    return
  }
  void socket.on('txs-broadcast', broadcastTxs)
}

addressesNs.on('connection', addressRouteConnection)
broadcastNs.on('connection', broadcastRouteConnection)
httpServer.listen(5000, () => {
  console.log('WS service listening')
})
