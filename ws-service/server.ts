import express from 'express'
import cors from 'cors'
import { onBroadcastTxData } from './events'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

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
  const countA = io.of('/addresses').sockets.size
  console.log('conn:', addresses)
  console.log('  total:', countA)
  for (const addr of addresses) {
    void socket.join(addr)
  }
  void socket.on('broadcast-new-tx', onBroadcastTxData(socket))
  void socket.on('disconnect', () => {
    const countA = io.of('/addresses').sockets.size
    console.log('disc:', addresses)
    console.log('  total:', countA)
  })
}

io.of('/addresses').on('connection', addressRouteConnection)

httpServer.listen(5000, () => {
  console.log('WS service listening')
})
