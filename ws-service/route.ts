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

interface AddressInfo {
  clientIP: string
  timestamp: number
  socketId: string
  namespace: string
}

let connectedAddressesInfo: Record<string, AddressInfo[]> = {}
interface HandleConnectionArgs {
  namespace: string
  socket: Socket
  addressList?: string[]
}

function handleConnection ({ namespace, socket, addressList }: HandleConnectionArgs): void {
  if (namespace === 'addresses' && addressList !== undefined) {
    for (const addr of addressList) {
      void socket.join(addr)
      if (connectedAddressesInfo[addr] === undefined) {
        connectedAddressesInfo[addr] = []
      }
      connectedAddressesInfo[addr].push({
        socketId: socket.id,
        clientIP: socket.handshake.address,
        timestamp: socket.handshake.issued,
        namespace: 'addresses'
      })
    }
  } else {
    if (connectedAddressesInfo[namespace] === undefined) {
      connectedAddressesInfo[namespace] = []
    }
    connectedAddressesInfo[namespace].push({
      socketId: socket.id,
      clientIP: socket.handshake.address,
      timestamp: socket.handshake.issued,
      namespace: 'broadcast'
    })
  }
  const totalConnected = io.of(`/${namespace}`).sockets.size
  console.log(`/${namespace} — ----------------------------BEGIN---------------------------`)
  console.log(`/${namespace} — ${socket.id} connected.`)
  console.log(`/${namespace} — Connected addresses:`)
  console.log(connectedAddressesInfo)
  console.log(`/${namespace} — Total connected: `, totalConnected)
  console.log(`/${namespace} — -----------------------------END----------------------------`)
  void socket.on('disconnect', (reason: DisconnectReason, description: any) => {
    const totalConnected = io.of(namespace).sockets.size
    if (namespace === 'addresses' && addressList !== undefined) {
      for (const addr of addressList) {
        const infoArray = connectedAddressesInfo[addr]
        if (infoArray !== undefined) {
          connectedAddressesInfo[addr] = infoArray.filter(i => i.socketId !== socket.id)
          if (connectedAddressesInfo[addr].length === 0) {
            const { [addr]: _, ...remaining } = connectedAddressesInfo
            connectedAddressesInfo = remaining
          }
        }
      }
    } else {
      const infoArray = connectedAddressesInfo[namespace]
      if (infoArray !== undefined) {
        connectedAddressesInfo[namespace] = infoArray.filter(i => i.socketId !== socket.id)
        if (connectedAddressesInfo[namespace].length === 0) {
          const { [namespace]: _, ...remaining } = connectedAddressesInfo
          connectedAddressesInfo = remaining
        }
      }
    }
    console.log(`/${namespace} — ----------------------------BEGIN---------------------------`)
    console.log(`/${namespace} — ${socket.id} disconnected.`)
    console.log(`/${namespace} — Reason & Description:`)
    console.log({ reason, description })
    console.log(`/${namespace} — Connected addresses:`)
    console.log(connectedAddressesInfo)
    console.log(`/${namespace} — Total connected: `, totalConnected)
    console.log(`/${namespace} — -----------------------------END----------------------------`)
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
