import express from 'express'
import cors from 'cors'
import { BroadcastTxData, SideshiftQuote, CreateQuoteAndShiftData, GetPairRateData, SideShiftCoin, SideshiftPair, SideshiftShift } from './types'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import { BASE_SIDESHIFT_URL, RESPONSE_MESSAGES, SOCKET_MESSAGES } from '../constants/index'
import config from 'config/index'

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

const sendSideshiftPairRate = async (getPairRateData: GetPairRateData): Promise<SideshiftPair> => {
  const res = await fetch(BASE_SIDESHIFT_URL + `pair/${getPairRateData.from}/${getPairRateData.to}`)
  const data = await res.json()
  return data as SideshiftPair
}

type ErrorType = 'quote-error' | 'shift-error'
interface SideshiftError {
  errorType: ErrorType
  errorMessage: string
}

const createQuote = async (createQuoteData: CreateQuoteAndShiftData): Promise<SideshiftQuote | SideshiftError> => {
  const requestBody = JSON.stringify({
    ...createQuoteData,
    affiliateId: config.sideshiftAffiliateId
  })

  const res = await fetch(BASE_SIDESHIFT_URL + 'quotes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sideshift-secret': process.env.SIDESHIFT_SECRET_KEY as string
    },
    body: requestBody
  })
  const data = await res.json()
  if ('error' in data) {
    console.error('Error when creating sideshift quote.', {
      createQuoteData,
      responseData: data
    })
    return {
      errorType: 'quote-error',
      errorMessage: data.error.message
    }
  }
  const quoteResponse = data as SideshiftQuote
  console.log('created quote', quoteResponse)
  return quoteResponse
}

interface CreateShiftData {
  quoteId: string
  settleAddress: string
}

const createShift = async (createShiftData: CreateShiftData): Promise<SideshiftShift | SideshiftError> => {
  const { quoteId, settleAddress } = createShiftData
  const requestBody = JSON.stringify({
    affiliateId: config.sideshiftAffiliateId,
    settleAddress,
    quoteId
  })

  const res = await fetch(BASE_SIDESHIFT_URL + 'shifts/fixed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sideshift-secret': process.env.SIDESHIFT_SECRET_KEY as string
    },
    body: requestBody
  })
  const data = await res.json()
  if ('error' in data) {
    console.error('Error when creating sideshift shift.', {
      createShiftData,
      responseData: data
    })
    return {
      errorType: 'shift-error',
      errorMessage: data.error.message
    }
  }
  const shiftResponse = data as SideshiftShift
  console.log('Successfully created shift.', { shiftResponse })
  return shiftResponse
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
  // WIP two lines above are useless so far
  const coins = await sendSideshiftCoinsInfo()
  void socket.emit(SOCKET_MESSAGES.SEND_SIDESHIFT_COINS_INFO, coins)
  void socket.on(SOCKET_MESSAGES.GET_SIDESHIFT_RATE, async (getPairRateData: GetPairRateData) => {
    const pairRate = await sendSideshiftPairRate(getPairRateData)
    socket.emit(SOCKET_MESSAGES.SEND_SIDESHIFT_RATE, pairRate)
  })
  void socket.on(SOCKET_MESSAGES.CREATE_SIDESHIFT_QUOTE, async (createQuoteData: CreateQuoteAndShiftData) => {
    const createdQuote = await createQuote(createQuoteData)
    if ('errorType' in createdQuote) {
      const quoteError = createdQuote
      socket.emit(SOCKET_MESSAGES.ERROR_WHEN_CREATING_QUOTE, quoteError)
    } else {
      const createdShift = await createShift({
        quoteId: createdQuote.id,
        settleAddress: createQuoteData.settleAddress
      })
      if ('errorType' in createdShift) {
        const shiftError = createdShift
        socket.emit(SOCKET_MESSAGES.ERROR_WHEN_CREATING_SHIFT, shiftError)
      } else {
        socket.emit(SOCKET_MESSAGES.SHIFT_CREATED, createdShift)
      }
    }
  })
}

addressesNs.on('connection', addressRouteConnection)
broadcastNs.on('connection', broadcastRouteConnection)
sideshiftNs.on('connection', sideshiftRouteConnection)
httpServer.listen(5000, () => {
  console.log('WS service listening')
})
