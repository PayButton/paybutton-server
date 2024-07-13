import { Prisma } from '@prisma/client'

type TxBroadcastType = 'NewTx' | 'OldTx'

export interface BroadcastTxData {
  address: string
  txs: SimplifiedTransaction[]
  messageType: TxBroadcastType
}

export interface SimplifiedTransaction {
  hash: string
  amount: Prisma.Decimal
  paymentId: string
  confirmed?: boolean
  message: string
  timestamp: number
  address: string
}

export interface CreateQuoteAndShiftData {
  depositAmount: string
  settleCoin: string
  depositCoin: string
  depositNetwork: string
  settleAddress: string
}

export interface SideshiftShiftRes {
  id: string
  createdAt: string
  depositCoin: string
  settleCoin: string
  depositNetwork: string
  settleNetwork: string
  depositAddress: string
  settleAddress: string
  depositMin: string
  depositMax: string
  averageShiftSeconds: string
  depositAmount: string
  expiresAt: string
  quoteId: string
  rate: string
  settleAmount: string
  status: string
  type: string
}

export interface SideshiftQuoteRes {
  id: string
  createdAt: string
  depositCoin: string
  settleCoin: string
  depositNetwork: string
  settleNetwork: string
  expiresAt: string
  depositAmount: string
  settleAmount: string
  rate: string
  affiliateId: string
}

interface TokenDetails {
  [network: string]: {
    contractAddress: string
    decimals: number
  }
}

export interface SideShiftCoinRes {
  networks: string[]
  coin: string
  name: string
  hasMemo: boolean
  fixedOnly: string[] | boolean
  variableOnly: string[] | boolean
  tokenDetails: TokenDetails
  depositOffline?: string[] | boolean
  settleOffline?: string[] | boolean
}

export interface SideshiftPairRes {
  min: string
  max: string
  rate: string
  depositCoin: string
  settleCoin: string
  depositNetwork: string
  settleNetwork: string
}

export interface GetPairRateData {
  from: string
  to: string
}
