import { GrpcBlockchainClient } from './grpcService'
import { ChronikBlockchainClient } from './chronikService'
import { getObjectValueForAddress, getObjectValueForNetworkSlug } from '../utils/index'
import { RESPONSE_MESSAGES, KeyValueT, NETWORK_BLOCKCHAIN_CLIENTS, BLOCKCHAIN_CLIENT_OPTIONS } from '../constants/index'
import {
  Transaction,
  GetTransactionResponse,
  GetAddressTransactionsResponse,
  GetAddressUnspentOutputsResponse,
  GetBlockchainInfoResponse,
  GetBlockInfoResponse
} from 'grpc-bchrpc-node'

export interface GetAddressParameters {
  address: string
  nbSkip?: number
  nbFetch?: number
  height?: number
  hash?: string
  reversedHashOrder?: boolean
}

export interface BlockchainClient {
  getBalance: (address: string) => Promise<number>
  getAddress: (parameters: GetAddressParameters) => Promise<GetAddressTransactionsResponse.AsObject>
  getUtxos: (address: string) => Promise<GetAddressUnspentOutputsResponse.AsObject>
  getBlockchainInfo: (networkSlug: string) => Promise<GetBlockchainInfoResponse.AsObject>
  getBlockInfo: (networkSlug: string, height: number) => Promise<GetBlockInfoResponse.AsObject>
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

export async function getAddress (parameters: GetAddressParameters): Promise<GetAddressTransactionsResponse.AsObject> {
  return await getObjectValueForAddress(parameters.address, BLOCKCHAIN_CLIENTS).getAddress(parameters)
}

export async function getUtxos (address: string): Promise<GetAddressUnspentOutputsResponse.AsObject> {
  return await getObjectValueForAddress(address, BLOCKCHAIN_CLIENTS).getUtxos(address)
}

export async function getBlockchainInfo (networkSlug: string): Promise<GetBlockchainInfoResponse.AsObject> {
  return await getObjectValueForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).getBlockchainInfo(networkSlug)
}

export async function getBlockInfo (networkSlug: string, height: number): Promise<GetBlockInfoResponse.AsObject> {
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
