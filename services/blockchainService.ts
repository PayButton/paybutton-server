import { GrpcBlockchainClient } from './grpcService'
import { ChronikBlockchainClient } from './chronikService'
import { getObjectValueForAddress, getObjectValueForNetworkSlug } from '../utils/index'
import { RESPONSE_MESSAGES, KeyValueT, NETWORK_BLOCKCHAIN_CLIENTS, BLOCKCHAIN_CLIENT_OPTIONS, NETWORK_IDS, NETWORK_TICKERS } from '../constants/index'
import { TransactionWithAddressAndPrices } from './transactionService'
import { Address, Prisma } from '@prisma/client'
import { Socket } from 'socket.io'

export interface BlockchainInfo {
  height: number
  hash: Uint8Array | string
}

export interface BlockInfo extends BlockchainInfo {
  timestamp: number
}

export interface GetAddressTransactionsParameters {
  addressString: string
  start: number
  maxTransactionsToReturn: number
}

interface InputOutput {
  value: Prisma.Decimal
  address?: string
}

export interface TransactionDetails {
  hash: string
  version: number
  inputs: InputOutput[]
  outputs: InputOutput[]
  block: {
    height?: number
    hash?: string
    timestamp?: string
  }
}

export interface AddressWithTransaction {
  address: Address
  transaction: Prisma.TransactionUncheckedCreateInput
}

export interface BlockchainClient {
  getBalance: (address: string) => Promise<number>
  syncTransactionsForAddress: (parameters: GetAddressTransactionsParameters) => Promise<TransactionWithAddressAndPrices[]>
  getBlockchainInfo: (networkSlug: string) => Promise<BlockchainInfo>
  getBlockInfo: (networkSlug: string, height: number) => Promise<BlockInfo>
  getTransactionDetails: (hash: string, networkSlug: string) => Promise<TransactionDetails>
  subscribeAddressesAddTransactions: (addresses: Address[]) => Promise<void>
  setSocket: (socket: Socket) => void
}

function getBlockchainClient (networkSlug: string): BlockchainClient {
  if (!Object.keys(NETWORK_BLOCKCHAIN_CLIENTS).includes(networkSlug)) { throw new Error(RESPONSE_MESSAGES.MISSING_BLOCKCHAIN_CLIENT_400.message) }

  switch (NETWORK_BLOCKCHAIN_CLIENTS[networkSlug]) {
    case 'grpc' as BLOCKCHAIN_CLIENT_OPTIONS:
      return new GrpcBlockchainClient()
    case 'chronik' as BLOCKCHAIN_CLIENT_OPTIONS:
      return new ChronikBlockchainClient()
    default:
      throw new Error(RESPONSE_MESSAGES.NO_BLOCKCHAIN_CLIENT_INSTANTIATED_400.message)
  }
}

export const BLOCKCHAIN_CLIENTS: KeyValueT<BlockchainClient> = {
  ecash: getBlockchainClient('ecash'),
  bitcoincash: getBlockchainClient('bitcoincash')
}

export async function getBalance (address: string): Promise<number> {
  return await getObjectValueForAddress(address, BLOCKCHAIN_CLIENTS).getBalance(address)
}

export async function syncTransactionsForAddress (parameters: GetAddressTransactionsParameters): Promise<TransactionWithAddressAndPrices[]> {
  return await getObjectValueForAddress(parameters.addressString, BLOCKCHAIN_CLIENTS).syncTransactionsForAddress(parameters)
}

export async function getLastBlockTimestamp (networkSlug: string): Promise<number> {
  const client = getObjectValueForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS)
  const blockchainInfo = await client.getBlockchainInfo(networkSlug)
  const lastBlockInfo = await client.getBlockInfo(networkSlug, blockchainInfo.height)
  return lastBlockInfo.timestamp
}

export async function getTransactionDetails (hash: string, networkSlug: string): Promise<TransactionDetails> {
  return await getObjectValueForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).getTransactionDetails(hash, networkSlug)
}

export async function subscribeAddressesAddTransactions (addresses: Address[]): Promise<void> {
  await Promise.all(
    Object.keys(BLOCKCHAIN_CLIENTS).map(async networkSlug => {
      const addressesOfNetwork = addresses.filter(address => address.networkId === NETWORK_IDS[NETWORK_TICKERS[networkSlug]])
      const client = BLOCKCHAIN_CLIENTS[networkSlug]
      await client.subscribeAddressesAddTransactions(addressesOfNetwork)
    })
  )
}
