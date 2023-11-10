import express from 'express'
import cors from 'cors'
import { BroadcastTxData } from './types'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import { RESPONSE_MESSAGES } from '../constants/index'
import { clearDashboardCache, clearRecentAddressCache } from 'redis/paymentCache'
import { fetchUsersForAddress } from 'services/userService'

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

const broadcastTxs = async (broadcastTxData: BroadcastTxData): Promise<void> => {
  console.log('broadcasting', broadcastTxData.txs.length, broadcastTxData.messageType, 'txs to', broadcastTxData.address)
  if (broadcastTxData?.txs?.length === 0) {
    console.warn(RESPONSE_MESSAGES.BROADCAST_EMPTY_TX_400)
    return
  }
  addressesNs.to(broadcastTxData.address).emit('incoming-txs', broadcastTxData)
  await clearRecentAddressCache(broadcastTxData.address, broadcastTxData.txs.map(tx => tx.timestamp))
  const userIds = await fetchUsersForAddress(broadcastTxData.address)
  await Promise.all(
    userIds.map(async u => {
      await clearDashboardCache(u.id)
    })
  )
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
