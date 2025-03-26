import express from 'express'
import cors from 'cors'
import { BroadcastTxData, CreateQuoteAndShiftData, GetPairRateData } from './types'
import { createServer } from 'http'
import { DisconnectReason, Server, Socket } from 'socket.io'
import { RESPONSE_MESSAGES, SOCKET_MESSAGES } from '../constants/index'
import { createSideshiftShift } from 'services/sideshiftService'
import { getSideshiftCoinsInfo, getSideshiftPairRate, postSideshiftQuote, postSideshiftShift } from './sideshift'

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

interface ConnectionInfo {
  clientIP: string
  timestamp: number
  socketId: string
  totalConnectedInNamespace: number
  addressList?: string[]
  reason?: string
  description?: string
}

interface HandleConnectionArgs {
  namespace: string
  socket: Socket
  addressList?: string[]
}

function handleConnection ({ namespace, socket, addressList }: HandleConnectionArgs): void {
  console.log(`/${namespace} — ${socket.id} CONNECTED`)
  const totalConnectedInNamespace = io.of(`/${namespace}`).sockets.size
  const info: ConnectionInfo = {
    socketId: socket.id,
    clientIP: socket.handshake.address,
    timestamp: socket.handshake.issued,
    totalConnectedInNamespace
  }
  if (addressList !== undefined) info.addressList = addressList
  console.log(`/${namespace} —`, info)
  void socket.on('disconnect', (reason: DisconnectReason, description: any) => {
    console.log(`/${namespace} — ${socket.id} DISCONNECTED`)
    const totalConnectedInNamespace = io.of(`/${namespace}`).sockets.size
    info.reason = reason
    info.totalConnectedInNamespace = totalConnectedInNamespace
    info.description = description
    console.log(`/${namespace} —`, info)
  })
}

const addressesNs = io.of('/addresses')
const addressRouteConnection = (socket: Socket): void => {
  let addressList: string[] = []
  if (typeof socket.handshake.query.addresses === 'string') {
    addressList = socket.handshake.query.addresses.split(',')
  } else if (Array.isArray(socket.handshake.query.addresses)) {
    addressList = socket.handshake.query.addresses
  }
  if (addressList.length === 0) {
    socket.disconnect(true)
    return
  }
  handleConnection({
    namespace: 'addresses',
    socket,
    addressList
  })
}

const broadcastTxs = async (broadcastTxData: BroadcastTxData): Promise<void> => {
  console.log('broadcasting', broadcastTxData.txs.length, broadcastTxData.messageType, 'txs to', broadcastTxData.address)
  try {
    const { address, txs } = broadcastTxData

    if (txs?.length === 0) {
      console.warn(RESPONSE_MESSAGES.BROADCAST_EMPTY_TX_400)
      return
    }

    addressesNs
      .to(address)
      .emit(SOCKET_MESSAGES.INCOMING_TXS, broadcastTxData)
  } catch (err: any) {
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
  handleConnection({
    namespace: 'broadcast',
    socket
  })
  void socket.on(SOCKET_MESSAGES.TXS_BROADCAST, broadcastTxs)
}

const altpaymentNs = io.of('/altpayment')
const altpaymentRouteConnection = async (socket: Socket): Promise<void> => {
  handleConnection({
    namespace: 'altpayment',
    socket
  })
  const headersForwardedAddresses = socket.handshake.headers['x-forwarded-for'] as string
  const userIp = headersForwardedAddresses === undefined ? '' : headersForwardedAddresses.split(',')[0]
  if (userIp === '') {
    throw new Error('Local IP not defined.')
    // userIp = (await (await fetch("<PUBLIC_IP_PROVIDER>", { headers: { 'Accept': 'application/json' } })).json())[<PUBLIC_IP_PROVIDER_IP_KEY>]
  }
  const userIpAlt = socket.handshake.address
  console.log('WIP, userIps', { userIp, userIpAlt })
  const coins = await getSideshiftCoinsInfo(userIp)
  void socket.emit(SOCKET_MESSAGES.SEND_ALTPAYMENT_COINS_INFO, coins)
  void socket.on(SOCKET_MESSAGES.GET_ALTPAYMENT_RATE, async (getPairRateData: GetPairRateData) => {
    const pairRate = await getSideshiftPairRate(getPairRateData, userIp)
    socket.emit(SOCKET_MESSAGES.SEND_ALTPAYMENT_RATE, pairRate)
  })
  void socket.on(SOCKET_MESSAGES.CREATE_ALTPAYMENT_QUOTE, async (createQuoteData: CreateQuoteAndShiftData) => {
    const createdQuoteRes = await postSideshiftQuote(createQuoteData, userIp)
    if ('errorType' in createdQuoteRes) {
      socket.emit(SOCKET_MESSAGES.ERROR_WHEN_CREATING_QUOTE, createdQuoteRes)
    } else {
      const createdShiftRes = await postSideshiftShift({
        quoteId: createdQuoteRes.id,
        settleAddress: createQuoteData.settleAddress
      }, userIp)
      if ('errorType' in createdShiftRes) {
        socket.emit(SOCKET_MESSAGES.ERROR_WHEN_CREATING_SHIFT, createdShiftRes)
      } else {
        await createSideshiftShift(createdShiftRes)
        socket.emit(SOCKET_MESSAGES.SHIFT_CREATED, createdShiftRes)
      }
    }
  })
}

addressesNs.on('connection', addressRouteConnection)
broadcastNs.on('connection', broadcastRouteConnection)
altpaymentNs.on('connection', altpaymentRouteConnection)
httpServer.listen(5000, () => {
  console.log('WS service listening')
})

const shutdown = (): void => {
  console.log('Shutting down gracefully...')
  io.close(() => {
    console.log('WebSocket server closed.')
    httpServer.close(() => {
      console.log('HTTP server closed.')
      process.exit(0)
    })
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
