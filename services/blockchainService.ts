import { ChronikBlockchainClient } from './chronikService'
import { getObjectValueForAddress, getObjectValueForNetworkSlug } from '../utils/index'
import { RESPONSE_MESSAGES, KeyValueT, NETWORK_IDS, NETWORK_TICKERS } from '../constants/index'
import { TransactionWithAddressAndPrices } from './transactionService'
import { Address, Prisma } from '@prisma/client'
import config, { BlockchainClientOptions } from 'config'
import { PHASE_PRODUCTION_BUILD } from 'next/dist/shared/lib/constants'

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
  syncTransactionsForAddress: (addressString: string) => AsyncGenerator<TransactionWithAddressAndPrices[]>
  getBlockchainInfo: (networkSlug: string) => Promise<BlockchainInfo>
  getBlockInfo: (networkSlug: string, height: number) => Promise<BlockInfo>
  getTransactionDetails: (hash: string, networkSlug: string) => Promise<TransactionDetails>
  subscribeAddresses: (addresses: Address[]) => Promise<void>
}

interface NetworkClients{
  ecash?: ChronikBlockchainClient
  bitcoincash?: ChronikBlockchainClient
}

export type Networks = 'ecash' | 'bitcoincash'

export interface NodeJsGlobalChronik extends NodeJS.Global {
  chronik?: NetworkClients
}
declare const global: NodeJsGlobalChronik

function getBlockchainClient (networkSlug: Networks): BlockchainClient {
  if (!Object.keys(config.networkBlockchainClients).includes(networkSlug)) { throw new Error(RESPONSE_MESSAGES.MISSING_BLOCKCHAIN_CLIENT_400.message) }

  switch (config.networkBlockchainClients[networkSlug]) {
    case 'chronik' as BlockchainClientOptions:
      if (global.chronik === undefined || global.chronik[networkSlug] === undefined) {
        console.log('creating chronik client for ', networkSlug)
        const newClient = new ChronikBlockchainClient(networkSlug)
        if (global.chronik === undefined) {
          global.chronik = {
            [networkSlug]: newClient
          }
        } else {
          global.chronik[networkSlug] = newClient
        }
        // Subscribe addresses & Sync lost transactions on DB upon client initialization
        if (
          process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD &&
          process.env.NODE_ENV !== 'test' &&
          process.env.JOBS_ENV === undefined
        ) {
          console.log('subscribing existent addresses...')
          void newClient.subscribeInitialAddresses()
          console.log('syncing missed transactions...')
          void newClient.syncMissedTransactions()
        }
      }
      return global.chronik[networkSlug] as BlockchainClient
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

export async function * syncTransactionsForAddress (addressString: string): AsyncGenerator<TransactionWithAddressAndPrices[]> {
  const innerGenerator = getObjectValueForAddress(addressString, BLOCKCHAIN_CLIENTS).syncTransactionsForAddress(addressString)
  for await (const value of innerGenerator) {
    yield value
  }
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

export async function subscribeAddresses (addresses: Address[]): Promise<void> {
  await Promise.all(
    Object.keys(BLOCKCHAIN_CLIENTS).map(async networkSlug => {
      const addressesOfNetwork = addresses.filter(address => address.networkId === NETWORK_IDS[NETWORK_TICKERS[networkSlug]])
      const client = BLOCKCHAIN_CLIENTS[networkSlug]
      await client.subscribeAddresses(addressesOfNetwork)
    })
  )
}
