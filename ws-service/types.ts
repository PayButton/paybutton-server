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

export interface CreateQuoteData {
  settleAmount: string
  settleCoin: string
  depositCoin: string
  depositNetwork: string
}

interface TokenDetails {
  [network: string]: {
    contractAddress: string
    decimals: number
  }
}

export interface SideShiftCoin {
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

export interface SideshiftPair {
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
