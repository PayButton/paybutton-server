import { GrpcBlockchainClient } from './grpcService'
import { Tx, TxHistoryPage, Utxo, SubscribeMsg, WsEndpoint } from 'chronik-client'
import { ChronikBlockchainClient } from './chronikService'
import { getObjectValueForAddress, getObjectValueForNetworkSlug } from '../utils/index'
import { RESPONSE_MESSAGES, KeyValueT, NETWORK_BLOCKCHAIN_CLIENTS, BLOCKCHAIN_CLIENT_OPTIONS } from '../constants/index'
import * as ws from 'ws'

export interface BlockchainInfo {
  height: number
  hash: Uint8Array | string
}

export interface BlockInfo extends BlockchainInfo {
  timestamp: number
}

export interface BlockchainClient {
  getBalance: (address: string) => Promise<number>
  getAddressTransactions: (address: string, page?: number, pageSize?: number) => Promise<TxHistoryPage>
  getUtxos: (address: string) => Promise<Utxo[]>
  getBlockchainInfo: (networkSlug: string) => Promise<BlockchainInfo>
  getBlockInfo: (networkSlug: string, height: number) => Promise<BlockInfo>
  getTransactionDetails: (txId: string) => Promise<Tx>
  subscribeTransactions: (
    addresses: string[],
    onMessage: (msg: SubscribeMsg) => void,
    onConnect?: (e: ws.Event) => void,
    onError?: (e: ws.ErrorEvent) => void,
    onEnd?: (e: ws.Event) => void
  ) => Promise<WsEndpoint>
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

export async function getAddressTransactions (address: string, page?: number, pageSize?: number): Promise<TxHistoryPage> {
  return await getObjectValueForAddress(address, BLOCKCHAIN_CLIENTS).getAddressTransactions(address, page, pageSize)
}

export async function getUtxos (address: string): Promise<Utxo[]> {
  return await getObjectValueForAddress(address, BLOCKCHAIN_CLIENTS).getUtxos(address)
}

export async function getBlockchainInfo (networkSlug: string): Promise<BlockchainInfo> {
  return await getObjectValueForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).getBlockchainInfo(networkSlug)
}

export async function getBlockInfo (networkSlug: string, height: number): Promise<BlockInfo> {
  return await getObjectValueForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).getBlockInfo(networkSlug, height)
}

export async function getTransactionDetails (txId: string, networkSlug: string): Promise<Tx> {
  return await getObjectValueForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).getTransactionDetails(txId)
}

export async function subscribeTransactions (
  networkSlug: string,
  addresses: string[],
  onMessage: (msg: SubscribeMsg) => void,
  onConnect?: (e: ws.Event) => void,
  onError?: (e: ws.ErrorEvent) => void,
  onEnd?: (e: ws.Event) => void
): Promise<WsEndpoint> {
  return await getObjectValueForNetworkSlug(networkSlug, BLOCKCHAIN_CLIENTS).subscribeTransactions(
    addresses,
    onMessage,
    onConnect,
    onError,
    onEnd
  )
}
