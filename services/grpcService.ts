import {
  GrpcClient,
  Transaction,
  MempoolTransaction,
  GetAddressUnspentOutputsResponse,
  TransactionNotification
} from 'grpc-bchrpc-node'

import { BlockchainClient, BlockchainInfo, BlockInfo, Transfer, TransfersResponse } from './blockchainService'
import { getObjectValueForNetworkSlug, getObjectValueForAddress, satoshisToUnit, pubkeyToAddress, removeAddressPrefix, getAddressPrefix } from '../utils/index'
import { BCH_NETWORK_ID, BCH_TIMESTAMP_THRESHOLD, FETCH_DELAY, FETCH_N, KeyValueT, NETWORK_SLUGS, RESPONSE_MESSAGES, XEC_NETWORK_ID, XEC_TIMESTAMP_THRESHOLD } from '../constants/index'
import { Address, Prisma } from '@prisma/client'
import xecaddr from 'xecaddrjs'
import { Tx } from 'chronik-client'
import * as transactionService from './transactionService'

export interface OutputsList {
  outpoint: object
  pubkeyScript: string
  value: number
  isCoinbase: boolean
  blockHeight: number
  slpToken: string | undefined
}

const grpcBCH = new GrpcClient({ url: process.env.GRPC_BCH_NODE_URL })

export const getGrpcClients = (): KeyValueT<GrpcClient> => {
  return {
    bitcoincash: grpcBCH
    // ecash: new GrpcClient({ url: process.env.GRPC_XEC_NODE_URL })
  }
}

export class GrpcBlockchainClient implements BlockchainClient {
  availableNetworks: string[]
  subscribedAddresses: KeyValueT<Address>

  constructor () {
    this.availableNetworks = [NETWORK_SLUGS.bitcoincash]
    this.subscribedAddresses = {}
  }

  private getClientForAddress (addressString: string): GrpcClient {
    return getObjectValueForAddress(addressString, getGrpcClients())
  }

  private getClientForNetworkSlug (networkSlug: string): GrpcClient {
    return getObjectValueForNetworkSlug(networkSlug, getGrpcClients())
  }

  public async getBlockchainInfo (networkSlug: string): Promise<BlockchainInfo> {
    const client = this.getClientForNetworkSlug(networkSlug)
    const blockchainInfo = (await client.getBlockchainInfo()).toObject()
    return { height: blockchainInfo.bestHeight, hash: blockchainInfo.bestBlockHash }
  };

  public async getBlockInfo (networkSlug: string, height: number): Promise<BlockInfo> {
    const client = this.getClientForNetworkSlug(networkSlug)
    const blockInfo = (await client.getBlockInfo({ index: height })).toObject()?.info
    if (blockInfo === undefined) { throw new Error(RESPONSE_MESSAGES.COULD_NOT_GET_BLOCK_INFO_500.message) }
    return { hash: blockInfo.hash, height: blockInfo.height, timestamp: blockInfo.timestamp }
  };

  private txThesholdFilter (address: Address) {
    return (t: Transaction.AsObject, index: number, array: Transaction.AsObject[]): boolean => {
      return (
        (t.timestamp >= XEC_TIMESTAMP_THRESHOLD && address.networkId === XEC_NETWORK_ID) ||
				(t.timestamp >= BCH_TIMESTAMP_THRESHOLD && address.networkId === BCH_NETWORK_ID)
      )
    }
  }

  private parseMempoolTx (mempoolTx: MempoolTransaction.AsObject): Transaction.AsObject {
    const tx = mempoolTx.transaction!
    tx.timestamp = mempoolTx.addedTime
    return tx
  }

  private async getTransactionAmount (transaction: Transaction.AsObject, addressString: string): Promise<Prisma.Decimal> {
    let totalOutput = 0
    let totalInput = 0
    const addressFormat = xecaddr.detectAddressFormat(addressString)
    const unprefixedAddress = removeAddressPrefix(addressString)

    for (const output of transaction.outputsList) {
      let outAddress: string | undefined = removeAddressPrefix(output.address)
      if (output.scriptClass === 'pubkey') {
        outAddress = await pubkeyToAddress(outAddress, addressFormat)
        if (outAddress !== undefined) outAddress = removeAddressPrefix(outAddress)
      }
      if (unprefixedAddress === outAddress) {
        totalOutput += output.value
      }
    }
    for (const input of transaction.inputsList) {
      let addressFromPkey = await pubkeyToAddress(input.address, addressFormat)
      if (addressFromPkey !== undefined) addressFromPkey = removeAddressPrefix(addressFromPkey)
      if (unprefixedAddress === removeAddressPrefix(input.address) || unprefixedAddress === addressFromPkey) {
        totalInput += input.value
      }
    }
    const satoshis = new Prisma.Decimal(totalOutput).minus(totalInput)
    return await satoshisToUnit(
      satoshis,
      addressFormat
    )
  }

  private async getTransferFromTransaction (transaction: Transaction.AsObject, address: Address): Promise<Transfer> {
    return {
      address,
      txid: transaction.hash as string,
      receivedAmount: await this.getTransactionAmount(transaction, address.address),
      timestamp: transaction.timestamp
    }
  }

  private async getTransfersSubscribedAddressesFromTransaction (transaction: Transaction.AsObject): Promise<Transfer[]> {
    const transfers = await Promise.all(Object.values(this.subscribedAddresses).map(
      async address => await this.getTransferFromTransaction(transaction, address)
    ))
    return transfers.filter(transfer => transfer.receivedAmount.toNumber() !== 0)
  }

  public async getAddressTransfers (address: Address, maxTransfers?: number): Promise<TransfersResponse> {
    const client = this.getClientForAddress(address.address)
    maxTransfers = maxTransfers ?? Infinity
    const pageSize = FETCH_N
    let newTransactionsCount = -1
    let page = 0
    const confirmedTransactions: Transaction.AsObject[] = []
    const unconfirmedTransactions: Transaction.AsObject[] = []

    while (confirmedTransactions.length < maxTransfers && newTransactionsCount !== 0) {
      const transactions = (await client.getAddressTransactions({
        address: address.address,
        nbSkip: page * pageSize,
        nbFetch: pageSize
      })).toObject()

      // remove transactions older than the networks
      confirmedTransactions.push(...transactions.confirmedTransactionsList.filter(this.txThesholdFilter(address)))
      unconfirmedTransactions.push(...transactions.unconfirmedTransactionsList.map(mempoolTx => this.parseMempoolTx(mempoolTx)))

      newTransactionsCount = transactions.confirmedTransactionsList.length
      page += 1

      await new Promise(resolve => setTimeout(resolve, FETCH_DELAY))
    }

    confirmedTransactions.splice(maxTransfers)

    return {
      confirmed: await Promise.all(confirmedTransactions.map(async tx => await this.getTransferFromTransaction(tx, address))),
      unconfirmed: await Promise.all(unconfirmedTransactions.map(async tx => await this.getTransferFromTransaction(tx, address)))
    }
  };

  public async getUtxos (address: string): Promise<GetAddressUnspentOutputsResponse.AsObject> {
    const client = this.getClientForAddress(address)
    const res = (await client.getAddressUtxos({ address })).toObject()
    return res
  };

  public async getBalance (address: string): Promise<number> {
    const { outputsList } = await this.getUtxos(address)
    return outputsList.reduce((acc, output) => acc + output.value, 0)
  };

  // WIP
  public async getTransactionDetails (hash: string): Promise<Tx> {
    throw new Error('Method not implemented.')
    // const client = this.getClientForNetworkSlug(networkSlug)
    // const res = (
    //   await client.getTransaction({ hash, reversedHashOrder: true })
    // ).toObject()
    // return res
  };

  public async subscribeAddressesAddTransactions (addresses: Address[]): Promise<void> {
    if (addresses.length === 0) throw new Error(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message)

    const addressesAlreadySubscribed = addresses.filter(address => Object.keys(this.subscribedAddresses).includes(address.address))
    if (addressesAlreadySubscribed.length === addresses.length) throw new Error(RESPONSE_MESSAGES.ADDRESSES_ALREADY_SUBSCRIBED_400.message)
    addressesAlreadySubscribed.forEach(address => {
      console.log(`This address was already subscribed: ${address.address}`)
    })
    addresses = addresses.filter(address => !addressesAlreadySubscribed.includes(address))

    const addressesInClients: KeyValueT<Address[]> = {}
    this.availableNetworks.forEach(networkSlug => {
      addressesInClients[networkSlug] = []
    })
    addresses.forEach(address => {
      const prefix = getAddressPrefix(address.address)
      if (!Object.keys(addressesInClients).includes(prefix)) { throw new Error(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message) }
      addressesInClients[prefix].push(address)
    })

    for (const [key, value] of Object.entries(addressesInClients)) {
      const client = getGrpcClients()[key]
      const addressesToSubscribe = value.map(address => address.address)

      const confirmedStream = await client.subscribeTransactions({
        includeMempoolAcceptance: false,
        includeBlockAcceptance: true,
        addresses: addressesToSubscribe
      })
      const unconfirmedStream = await client.subscribeTransactions({
        includeMempoolAcceptance: true,
        includeBlockAcceptance: false,
        addresses: addressesToSubscribe
      })

      const nowDateString = (new Date()).toISOString()

      // output for end, error or close of stream
      void confirmedStream.on('end', () => {
        console.log(`${nowDateString}: addresses ${addresses.join(', ')} confirmed stream ended`)
      })
      void confirmedStream.on('close', () => {
        console.log(`${nowDateString}: addresses ${addresses.join(', ')} confirmed stream closed`)
      })
      void confirmedStream.on('error', (error: any) => {
        console.log(`${nowDateString}: addresses ${addresses.join(', ')} confirmed stream error`, error)
      })
      void unconfirmedStream.on('end', () => {
        console.log(`${nowDateString}: addresses ${addresses.join(', ')} unconfirmed stream ended`)
      })
      void unconfirmedStream.on('close', () => {
        console.log(`${nowDateString}: addresses ${addresses.join(', ')} unconfirmed stream closed`)
      })
      void unconfirmedStream.on('error', (error: any) => {
        console.log(`${nowDateString}: addresses ${addresses.join(', ')} unconfirmed stream error`, error)
      })

      // output for data stream
      void confirmedStream.on('data', (data: TransactionNotification) => {
        void this.processSubscribedNotification(data)
      })

      // subscribed addresses
      value.forEach(address => {
        this.subscribedAddresses[address.address] = address
      })
    }
  }

  private async processSubscribedNotification (data: TransactionNotification): Promise<void> {
    // add confirmed transactions to database
    const transaction = data.getConfirmedTransaction()!.toObject()
    const transfers = await this.getTransfersSubscribedAddressesFromTransaction(transaction)
    await Promise.all(
      transfers.map(async transfer => await transactionService.upsertTransaction(transfer, true))
    )

    // remove confirmed transactions from unconfirmed transactions
    const transactionsToDelete = await transactionService.fetchUnconfirmedTransactions(transaction.hash as string)
    await transactionService.deleteTransactions(transactionsToDelete)

    // add unconfirmed transactions to database
    const unconfirmedTransaction = data.getUnconfirmedTransaction()!.toObject()
    const parsedUnconfirmedTransaction = this.parseMempoolTx(unconfirmedTransaction)
    const unconfirmedTransfers = await this.getTransfersSubscribedAddressesFromTransaction(parsedUnconfirmedTransaction)
    await Promise.all(
      unconfirmedTransfers.map(async transfer => await transactionService.upsertTransaction(transfer, false))
    )
  }
}
