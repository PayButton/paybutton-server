import { Address, Prisma } from '@prisma/client'
import { KeyValueT } from 'constants/index'

interface InputOutput {
  value: bigint
  address?: string
}

export type Networks = 'ecash' | 'bitcoincash'

export interface AddressWithTransaction {
  address: Address
  transaction: Prisma.TransactionUncheckedCreateInput
}

export interface BlockchainInfo {
  height: number
  hash: Uint8Array | string
}

export interface SimpleBlockInfo extends BlockchainInfo {
  timestamp: number
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

export interface SubbedAddressesLog {
  [k: string]: string[]
}

export interface ProcessedMessages {
  confirmed: KeyValueT<number>
  unconfirmed: KeyValueT<number>
}

export interface SubscriptionReturn {
  failedAddressesWithErrors: KeyValueT<string>
}

export interface SyncAndSubscriptionReturn {
  failedAddressesWithErrors: KeyValueT<string>
  successfulAddressesWithCount: KeyValueT<number>
}
