import express from 'express'
import cors from 'cors'
import { BroadcastTxData, CreateQuoteData, GetPairRateData, SideShiftCoin, SideshiftPair } from './types'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import { RESPONSE_MESSAGES, SOCKET_MESSAGES } from '../constants/index'

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

const BASE_SIDESHIFT_URL = 'https://sideshift.ai/api/v2/' // WIP

const sendSideshiftPairRate = async (getPairRateData: GetPairRateData): Promise<SideshiftPair> => {
  const res = await fetch(BASE_SIDESHIFT_URL + `pair/${getPairRateData.from}/${getPairRateData.to}`)
  const data = await res.json()
  return data as SideshiftPair
}

const createSideshiftQuote = async (createQuoteData: CreateQuoteData): Promise<void> => {
  console.log('create quote!')
  void sendSideshiftQuoteInfo(createQuoteData)
}

const sendSideshiftQuoteInfo = async (createQuoteData: CreateQuoteData): Promise<void> => {
  console.log('send quote!', createQuoteData)
}

const sendSideshiftCoinsInfo = async (): Promise<SideShiftCoin[]> => {
  const res = await fetch(BASE_SIDESHIFT_URL + 'coins')
  const data = await res.json()

  const coins = data as SideShiftCoin[]
  coins.sort((a, b) => a.name < b.name ? -1 : 1)
  return coins
}

const sideshiftNs = io.of('/sideshift')
const sideshiftRouteConnection = async (socket: Socket): Promise<void> => {
  const uuid: string = socket.handshake.query.uuid as string
  void socket.join(uuid)
  const coins = await sendSideshiftCoinsInfo()
  void sideshiftNs.to(uuid).emit(SOCKET_MESSAGES.SEND_SIDESHIFT_COINS_INFO, coins)
  void socket.on(SOCKET_MESSAGES.GET_SIDESHIFT_RATE, sendSideshiftPairRate)
  void socket.on(SOCKET_MESSAGES.CREATE_SIDESHIFT_QUOTE, createSideshiftQuote)
}

addressesNs.on('connection', addressRouteConnection)
broadcastNs.on('connection', broadcastRouteConnection)
sideshiftNs.on('connection', sideshiftRouteConnection)
httpServer.listen(5000, () => {
  console.log('WS service listening')
})
