import {
  GrpcClient,
  TransactionNotification,
  Transaction as GrpcTransaction,
  GetAddressUnspentOutputsResponse,
  MempoolTransaction,
  Transaction
} from 'grpc-bchrpc-node'

import { AddressWithTransaction, BlockchainClient, BlockchainInfo, BlockInfo, GetAddressTransactionsParameters, TransactionDetails } from './blockchainService'
import { getObjectValueForNetworkSlug, getObjectValueForAddress, satoshisToUnit, pubkeyToAddress, removeAddressPrefix, groupAddressesByNetwork } from '../utils/index'
import { BCH_NETWORK_ID, BCH_TIMESTAMP_THRESHOLD, FETCH_DELAY, FETCH_N, KeyValueT, NETWORK_SLUGS, RESPONSE_MESSAGES, XEC_NETWORK_ID, XEC_TIMESTAMP_THRESHOLD } from '../constants/index'
import { Address, Prisma } from '@prisma/client'
import xecaddr from 'xecaddrjs'
import { fetchAddressBySubstring } from './addressService'
import { TransactionWithAddressAndPrices, createTransaction, createManyTransactions, base64HashToHex, deleteTransactions, fetchUnconfirmedTransactions } from './transactionService'
import { BroadcastTxData } from 'ws-service/types'
import config from 'config'
import io, { Socket } from 'socket.io-client'

export interface OutputsList {
  outpoint: object
  pubkeyScript: string
  value: number
  isCoinbase: boolean
  blockHeight: number
  slpToken: string | undefined
}

const grpcBCH = new GrpcClient({ url: config.grpcBCHNodeURL })

export const getGrpcClients = (): KeyValueT<GrpcClient> => {
  return {
    bitcoincash: grpcBCH,
    ecash: new GrpcClient({ url: config.grpcXECNodeURL })
  }
}

export class GrpcBlockchainClient implements BlockchainClient {
  availableNetworks: string[]
  subscribedAddresses: KeyValueT<Address>
  wsEndpoint: Socket

  constructor () {
    this.availableNetworks = [NETWORK_SLUGS.bitcoincash, NETWORK_SLUGS.ecash]
    this.subscribedAddresses = {}
    this.wsEndpoint = io(`${config.wsBaseURL}/broadcast`, {
      query: {
        key: process.env.WS_AUTH_KEY
      }
    })
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
    return (t: GrpcTransaction.AsObject, index: number, array: GrpcTransaction.AsObject[]): boolean => {
      return (
        (t.timestamp >= XEC_TIMESTAMP_THRESHOLD && address.networkId === XEC_NETWORK_ID) ||
        (t.timestamp >= BCH_TIMESTAMP_THRESHOLD && address.networkId === BCH_NETWORK_ID)
      )
    }
  }

  private parseMempoolTx (mempoolTx: MempoolTransaction.AsObject): GrpcTransaction.AsObject {
    const tx = mempoolTx.transaction!
    tx.timestamp = mempoolTx.addedTime
    return tx
  }

  private async getTransactionAmount (transaction: GrpcTransaction.AsObject, addressString: string): Promise<Prisma.Decimal> {
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

  // WIP: this should be private in the future (after 411-6)
  public async getTransactionFromGrpcTransaction (transaction: GrpcTransaction.AsObject, address: Address, confirmed: boolean): Promise<Prisma.TransactionUncheckedCreateInput> {
    return {
      hash: await base64HashToHex(transaction.hash as string),
      amount: await this.getTransactionAmount(transaction, address.address),
      timestamp: transaction.timestamp,
      addressId: address.id,
      confirmed
    }
  }

  public async syncTransactionsForAddress (parameters: GetAddressTransactionsParameters): Promise<TransactionWithAddressAndPrices[]> {
    const address = await fetchAddressBySubstring(parameters.addressString)
    const pageSize = FETCH_N
    let totalFetchedConfirmedTransactions = 0
    let page = Math.floor(parameters.start / pageSize)
    let insertedTransactions: TransactionWithAddressAndPrices[] = []

    while (totalFetchedConfirmedTransactions < parameters.maxTransactionsToReturn) {
      const client = this.getClientForAddress(address.address)
      const transactions = (await client.getAddressTransactions({
        address: address.address,
        nbSkip: page * pageSize,
        nbFetch: pageSize
      })).toObject()

      if (transactions.confirmedTransactionsList.length === 0 && transactions.unconfirmedTransactionsList.length === 0) break

      // filter out transactions that happened before a certain date set in constants/index,
      //   this date is understood as the beginning and we don't look past it
      const confirmedTransactions = transactions.confirmedTransactionsList.filter(this.txThesholdFilter(address))
      const unconfirmedTransactions = transactions.unconfirmedTransactionsList.map(mempoolTx => this.parseMempoolTx(mempoolTx))

      totalFetchedConfirmedTransactions += confirmedTransactions.length
      page += 1

      if (totalFetchedConfirmedTransactions > parameters.maxTransactionsToReturn) {
        confirmedTransactions.splice(confirmedTransactions.length - (totalFetchedConfirmedTransactions - parameters.maxTransactionsToReturn))
      }

      const transactionsToPersist = [
        ...await Promise.all(
          confirmedTransactions.map(async tx => await this.getTransactionFromGrpcTransaction(tx, address, true))
        ),
        ...await Promise.all(
          unconfirmedTransactions.map(async tx => await this.getTransactionFromGrpcTransaction(tx, address, false))
        )
      ]
      const persistedTransactions = await createManyTransactions(transactionsToPersist)
      insertedTransactions = [...insertedTransactions, ...persistedTransactions]

      await new Promise(resolve => setTimeout(resolve, FETCH_DELAY))
    }

    return insertedTransactions
  };

  private async getUtxos (address: string): Promise<GetAddressUnspentOutputsResponse.AsObject> {
    const client = this.getClientForAddress(address)
    const res = (await client.getAddressUtxos({ address })).toObject()
    return res
  };

  public async getBalance (address: string): Promise<number> {
    const outputsList = (await this.getUtxos(address)).outputsList
    return outputsList.reduce((acc, output) => acc + output.value, 0)
  };

  public async getTransactionDetails (hash: string, networkSlug: string): Promise<TransactionDetails> {
    const client = this.getClientForNetworkSlug(networkSlug)
    const tx = (
      await client.getTransaction({ hash, reversedHashOrder: true })
    ).toObject().transaction as GrpcTransaction.AsObject

    const details: TransactionDetails = {
      hash: tx.hash as string,
      version: tx.version,
      block: {
        hash: tx.blockHash as string,
        height: tx.blockHeight,
        timestamp: `${tx.timestamp}`
      },
      inputs: [],
      outputs: []
    }
    for (const input of tx.inputsList) {
      details.inputs.push({
        value: new Prisma.Decimal(input.value),
        address: input.address
      })
    }
    for (const output of tx.outputsList) {
      details.outputs.push({
        value: new Prisma.Decimal(output.value),
        address: output.address
      })
    }
    return details
  };

  public async subscribeAddressesAddTransactions (addresses: Address[]): Promise<void> {
    if (addresses.length === 0) return

    const addressesAlreadySubscribed = addresses.filter(address => Object.keys(this.subscribedAddresses).includes(address.address))
    if (addressesAlreadySubscribed.length === addresses.length) return
    addressesAlreadySubscribed.forEach(address => {
      console.log(`This address was already subscribed: ${address.address}`)
    })
    addresses = addresses.filter(address => !addressesAlreadySubscribed.includes(address))

    const addressesByNetwork: KeyValueT<Address[]> = groupAddressesByNetwork(this.availableNetworks, addresses)

    for (const [network, networkAddresses] of Object.entries(addressesByNetwork)) {
      const client = getGrpcClients()[network]
      const addressesToSubscribe = networkAddresses.map(address => address.address)
      const stream = await client.subscribeTransactions({
        includeMempoolAcceptance: true,
        includeBlockAcceptance: true,
        addresses: addressesToSubscribe
      })
      const nowDateString = (new Date()).toISOString()

      // output for end, error or close of stream
      void stream.on('end', () => {
        console.log(`${nowDateString}: addresses ${addressesToSubscribe.join(', ')} stream ended`)
      })
      void stream.on('close', () => {
        console.log(`${nowDateString}: addresses ${addressesToSubscribe.join(', ')} stream closed`)
      })
      void stream.on('error', (error: any) => {
        console.log(`${nowDateString}: addresses ${addressesToSubscribe.join(', ')} stream error`, error)
      })

      // output for data stream
      void stream.on('data', (data: TransactionNotification) => {
        void this.processSubscribedNotification(data)
      })

      // subscribed addresses
      networkAddresses.forEach(address => {
        this.subscribedAddresses[address.address] = address
      })
    }
  }

  private async getAddressesForTransaction (transaction: Transaction.AsObject, confirmed: boolean): Promise<AddressWithTransaction[]> {
    const addressWithTransactions: AddressWithTransaction[] = await Promise.all(Object.values(this.subscribedAddresses).map(
      async address => {
        return {
          address,
          transaction: await this.getTransactionFromGrpcTransaction(transaction, address, confirmed)
        }
      }
    ))
    return addressWithTransactions.filter(
      addressWithTransaction => addressWithTransaction.transaction.amount > new Prisma.Decimal(0)
    )
  }

  private async processSubscribedNotification (data: TransactionNotification): Promise<void> {
    let addressWithConfirmedTransactions: AddressWithTransaction[] = []
    let addressWithUnconfirmedTransactions: AddressWithTransaction[] = []

    // get new confirmed transactions
    const confirmedTransaction = data.getConfirmedTransaction()?.toObject()
    if (confirmedTransaction != null) {
      addressWithConfirmedTransactions = await this.getAddressesForTransaction(confirmedTransaction, true)

      // remove unconfirmed transactions that have now been confirmed
      const transactionsToDelete = await fetchUnconfirmedTransactions(base64HashToHex(confirmedTransaction.hash as string))
      await deleteTransactions(transactionsToDelete)
    }

    // get new unconfirmed transactions
    const unconfirmedTransaction = data.getUnconfirmedTransaction()?.toObject()
    if (unconfirmedTransaction != null) {
      const parsedUnconfirmedTransaction = this.parseMempoolTx(unconfirmedTransaction)
      addressWithUnconfirmedTransactions = await this.getAddressesForTransaction(parsedUnconfirmedTransaction, false)
    }

    const broadcastTxData: BroadcastTxData = {} as BroadcastTxData
    await Promise.all(
      [...addressWithUnconfirmedTransactions, ...addressWithConfirmedTransactions].map(async addressWithTransaction => {
        const tx = await createTransaction(addressWithTransaction.transaction)
        if (tx !== undefined) {
          broadcastTxData.address = addressWithTransaction.address.address
          broadcastTxData.messageType = 'NewTx'
          broadcastTxData.txs = [tx]
        }
        return tx
      })
    )
    try {
      this.wsEndpoint.emit('txs-broadcast', broadcastTxData)
    } catch (err: any) {
      console.error(RESPONSE_MESSAGES.COULD_NOT_BROADCAST_TX_TO_WS_SERVER_500.message, err.stack)
    }
  }
}
