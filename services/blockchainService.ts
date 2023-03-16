import { GrpcBlockchainClient } from './grpcService'
import { Tx, Utxo } from 'chronik-client'
import { ChronikBlockchainClient } from './chronikService'
import { getObjectValueForAddress, getObjectValueForNetworkSlug } from '../utils/index'
import { RESPONSE_MESSAGES, KeyValueT, NETWORK_BLOCKCHAIN_CLIENTS, BLOCKCHAIN_CLIENT_OPTIONS } from '../constants/index'
import {
  Transaction
} from 'grpc-bchrpc-node'
import { Prisma } from '@prisma/client'

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
  txid: string
  timestamp: number
  receivedAmount: Prisma.Decimal
}

export interface BlockchainClient {
  getBalance: (address: string) => Promise<number>
  getAddressTransfers: (addressString: string, maxTransfers?: number) => Promise<TransfersResponse>
  getUtxos: (address: string) => Promise<Utxo[]>
  getBlockchainInfo: (networkSlug: string) => Promise<BlockchainInfo>
  getBlockInfo: (networkSlug: string, height: number) => Promise<BlockInfo>
  getTransactionDetails: (txId: string) => Promise<Tx>
  subscribeTransactions: (
    addresses: string[],
    onTransactionNotification: (txn: Transaction.AsObject) => any,
    onMempoolTransactionNotification: (txn: Transaction.AsObject) => any,
    networkSlug: string
  ) => Promise<void>
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

export async function getAddressTransfers (addressString: string, maxTransfers?: number): Promise<TransfersResponse> {
  return await getObjectValueForAddress(addressString, BLOCKCHAIN_CLIENTS).getAddressTransfers(addressString, maxTransfers)
}

export async function getUtxos (address: string): Promise<Utxo[]> {
  return await getObjectValueForAddress(address, BLOCKCHAIN_CLIENTS).getUtxos(address)
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

export async function subscribeTransactions (
  addresses: string[],
  onTransactionNotification: (txn: Transaction.AsObject) => any,
  onMempoolTransactionNotification: (txn: Transaction.AsObject) => any,
  networkSlug: string
): Promise<void> {
  return await getObjectValueForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).subscribeTransactions(addresses, onTransactionNotification, onMempoolTransactionNotification, networkSlug)
}
