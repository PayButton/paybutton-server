import { GrpcBlockchainClient, GetAddressParameters } from './grpcService'
import { ChronikBlockchainClient } from './chronikService'
import { getAddressPrefix } from '../utils/index'
import { RESPONSE_MESSAGES, NETWORK_SLUGS, KeyValueT, BLOCKCHAIN_CLIENTS_CHOSEN, BLOCKCHAIN_CLIENTS_OPTIONS } from '../constants/index'
import {
  Transaction,
  GetTransactionResponse,
  GetAddressTransactionsResponse,
  GetAddressUnspentOutputsResponse,
  GetBlockchainInfoResponse,
  GetBlockInfoResponse
} from 'grpc-bchrpc-node'

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

const grpc = new GrpcBlockchainClient()
const chronik = new ChronikBlockchainClient()

function getBlockchainClient (network: string): BlockchainClient {
  if (!Object.keys(BLOCKCHAIN_CLIENTS_CHOSEN).includes(network)) { throw new Error(RESPONSE_MESSAGES.MISSING_BLOCKCHAIN_CLIENT_400.message) }

  switch (BLOCKCHAIN_CLIENTS_CHOSEN[network]) {
    case BLOCKCHAIN_CLIENTS_OPTIONS.grpc:
      return grpc
    case BLOCKCHAIN_CLIENTS_OPTIONS.chronik:
      return chronik
    default:
      throw new Error(RESPONSE_MESSAGES.NO_BLOCKCHAIN_CLIENT_INSTANTIATED_400.message)
  }
}

export const BLOCKCHAIN_CLIENTS: KeyValueT<BlockchainClient> = {
  ecash: getBlockchainClient('ecash'),
  bitcoincash: getBlockchainClient('bitcoincash')
}

export function getObjectForAddress<T> (addressString: string, objects: KeyValueT<T>): T {
  const prefix = getAddressPrefix(addressString)
  if (!Object.keys(objects).includes(prefix)) { throw new Error(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message) }
  return objects[prefix]
}

export function getObjectForNetworkSlug<T> (networkSlug: string, objects: KeyValueT<T>): T {
  if (!Object.keys(NETWORK_SLUGS).includes(networkSlug)) { throw new Error(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.message) }
  return objects[networkSlug]
}

export async function getBalance (address: string): Promise<number> {
  return await getObjectForAddress(address, BLOCKCHAIN_CLIENTS).getBalance(address)
}

export async function getAddress (parameters: GetAddressParameters): Promise<GetAddressTransactionsResponse.AsObject> {
  return await getObjectForAddress(parameters.address, BLOCKCHAIN_CLIENTS).getAddress(parameters)
}

export async function getUtxos (address: string): Promise<GetAddressUnspentOutputsResponse.AsObject> {
  return await getObjectForAddress(address, BLOCKCHAIN_CLIENTS).getUtxos(address)
}

export async function getBlockchainInfo (networkSlug: string): Promise<GetBlockchainInfoResponse.AsObject> {
  return await getObjectForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).getBlockchainInfo(networkSlug)
}

export async function getBlockInfo (networkSlug: string, height: number): Promise<GetBlockInfoResponse.AsObject> {
  return await getObjectForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).getBlockInfo(networkSlug, height)
}

export async function getTransactionDetails (hash: string, networkSlug: string): Promise<GetTransactionResponse.AsObject> {
  return await getObjectForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).getTransactionDetails(hash, networkSlug)
}

export async function subscribeTransactions (
  addresses: string[],
  onTransactionNotification: (txn: Transaction.AsObject) => any,
  onMempoolTransactionNotification: (txn: Transaction.AsObject) => any,
  networkSlug: string
): Promise<void> {
  return await getObjectForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).subscribeTransactions(addresses, onTransactionNotification, onMempoolTransactionNotification, networkSlug)
}
