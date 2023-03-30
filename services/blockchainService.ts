import { GrpcBlockchainClient } from './grpcService'
import { ChronikBlockchainClient } from './chronikService'
import { getObjectValueForAddress, getObjectValueForNetworkSlug } from '../utils/index'
import { RESPONSE_MESSAGES, KeyValueT, NETWORK_BLOCKCHAIN_CLIENTS, BLOCKCHAIN_CLIENT_OPTIONS } from '../constants/index'
import {
  Transaction,
  GetTransactionResponse,
  GetAddressUnspentOutputsResponse
} from 'grpc-bchrpc-node'
import { Transaction as TransactionPrisma } from '@prisma/client'

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
  maxTransactions: number
}

export interface GetAddressTransactionsResponse {
  confirmed: TransactionPrisma[]
  unconfirmed: TransactionPrisma[]
}

export interface BlockchainClient {
  getBalance: (address: string) => Promise<number>
  getAddressTransactions: (parameters: GetAddressTransactionsParameters) => Promise<GetAddressTransactionsResponse>
  getUtxos: (address: string) => Promise<GetAddressUnspentOutputsResponse.AsObject>
  getBlockchainInfo: (networkSlug: string) => Promise<BlockchainInfo>
  getBlockInfo: (networkSlug: string, height: number) => Promise<BlockInfo>
  getTransactionDetails: (hash: string, networkSlug: string) => Promise<GetTransactionResponse.AsObject>
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

export async function getAddressTransactions (parameters: GetAddressTransactionsParameters): Promise<GetAddressTransactionsResponse> {
  return await getObjectValueForAddress(parameters.addressString, BLOCKCHAIN_CLIENTS).getAddressTransactions(parameters)
}

export async function getUtxos (address: string): Promise<GetAddressUnspentOutputsResponse.AsObject> {
  return await getObjectValueForAddress(address, BLOCKCHAIN_CLIENTS).getUtxos(address)
}

export async function getBlockchainInfo (networkSlug: string): Promise<BlockchainInfo> {
  return await getObjectValueForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).getBlockchainInfo(networkSlug)
}

export async function getBlockInfo (networkSlug: string, height: number): Promise<BlockInfo> {
  return await getObjectValueForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).getBlockInfo(networkSlug, height)
}

export async function getTransactionDetails (hash: string, networkSlug: string): Promise<GetTransactionResponse.AsObject> {
  return await getObjectValueForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).getTransactionDetails(hash, networkSlug)
}

export async function subscribeTransactions (
  addresses: string[],
  onTransactionNotification: (txn: Transaction.AsObject) => any,
  onMempoolTransactionNotification: (txn: Transaction.AsObject) => any,
  networkSlug: string
): Promise<void> {
  return await getObjectValueForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).subscribeTransactions(addresses, onTransactionNotification, onMempoolTransactionNotification, networkSlug)
}
