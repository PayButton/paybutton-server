import express from 'express'
import cors from 'cors'
import { BroadcastTxData, CreateQuoteAndShiftData, GetPairRateData } from './types'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
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
  void socket.on(SOCKET_MESSAGES.TXS_BROADCAST, broadcastTxs)
}

const altpaymentNs = io.of('/altpayment')
const altpaymentRouteConnection = async (socket: Socket): Promise<void> => {
  const headersAddress = socket.handshake.headers['X-FORWARDED-FOR']
  const headersAddressLC = socket.handshake.headers['x-forwarded-for']
  const remoteAddress = socket.request.connection.remoteAddress ?? ''
  const handshakeAddress = socket.handshake.address
  const origin = socket.handshake.headers.origin ?? ''
  const userIp = (headersAddressLC as string).split(',')[0]
  console.log('wip', { userIp, origin, handshakeAddress, remoteAddress, headersAddress, headersAddressLC })
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
