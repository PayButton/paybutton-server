import { BroadcastTxData } from './types'
import { Server, Socket } from 'socket.io'
import { RESPONSE_MESSAGES } from '../constants/index'

// Configure server
const io = new Server({
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

const broadcastTxs = (broadcastTxData: BroadcastTxData): void => {
  if (broadcastTxData?.txs?.length === 0) {
    console.warn(RESPONSE_MESSAGES.BROADCAST_EMPTY_TX_400)
    return
  }
  addressesNs.to(broadcastTxData.address).emit('incoming-txs', broadcastTxData)
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
io.listen(5000)
