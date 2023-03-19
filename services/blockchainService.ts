import { GrpcBlockchainClient } from './grpcService'
import { Tx } from 'chronik-client'
import { ChronikBlockchainClient } from './chronikService'
import { getObjectValueForAddress, getObjectValueForNetworkSlug } from '../utils/index'
import { RESPONSE_MESSAGES, KeyValueT, NETWORK_BLOCKCHAIN_CLIENTS, BLOCKCHAIN_CLIENT_OPTIONS } from '../constants/index'
import { Address, Prisma } from '@prisma/client'

export interface BlockchainInfo {
  height: number
  hash: Uint8Array | string
}

export interface BlockInfo extends BlockchainInfo {
  timestamp: number
}

export interface TransfersResponse {
  confirmed: Transfer[]
  unconfirmed: Transfer[]
}

export interface Transfer {
  address: Address
  txid: string
  timestamp: number
  receivedAmount: Prisma.Decimal
  confirmed?: boolean
}

export interface BlockchainClient {
  getBalance: (address: string) => Promise<number>
  getAddressTransfers: (address: Address, maxTransfers?: number) => Promise<TransfersResponse>
  getBlockchainInfo: (networkSlug: string) => Promise<BlockchainInfo>
  getBlockInfo: (networkSlug: string, height: number) => Promise<BlockInfo>
  getTransactionDetails: (txId: string) => Promise<Tx>
  subscribeAddressesAddTransactions: (addresses: Address[]) => Promise<void>
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

export async function getAddressTransfers (address: Address, maxTransfers?: number): Promise<TransfersResponse> {
  return await getObjectValueForAddress(address.address, BLOCKCHAIN_CLIENTS).getAddressTransfers(address, maxTransfers)
}

export async function getLastBlockTimestamp (networkSlug: string): Promise<number> {
  const client = getObjectValueForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS)
  const getBlockchainInfo = await client.getBlockchainInfo(networkSlug)
  const lastBlockInfo = await client.getBlockInfo(networkSlug, getBlockchainInfo.height)
  return lastBlockInfo.timestamp
}

export async function getTransactionDetails (txId: string, networkSlug: string): Promise<Tx> {
  return await getObjectValueForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).getTransactionDetails(txId)
}

export async function subscribeAddressesAddTransactions (addresses: Address[]): Promise<void> {
  // get first address network (all belong to the same network)
  const client = await getObjectValueForAddress(addresses[0].address, BLOCKCHAIN_CLIENTS)
  await client.subscribeAddressesAddTransactions(addresses)
}
