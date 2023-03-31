import {
  GrpcClient,
  TransactionNotification,
  Transaction,
  GetTransactionResponse,
  GetAddressUnspentOutputsResponse,
  MempoolTransaction
} from 'grpc-bchrpc-node'

import { BlockchainClient, BlockchainInfo, BlockInfo, GetAddressTransactionsParameters } from './blockchainService'
import { getObjectValueForNetworkSlug, getObjectValueForAddress, satoshisToUnit, pubkeyToAddress, removeAddressPrefix } from '../utils/index'
import { BCH_NETWORK_ID, BCH_TIMESTAMP_THRESHOLD, FETCH_DELAY, FETCH_N, KeyValueT, RESPONSE_MESSAGES, XEC_NETWORK_ID, XEC_TIMESTAMP_THRESHOLD } from '../constants/index'
import { Address, Prisma, Transaction as TransactionPrisma } from '@prisma/client'
import xecaddr from 'xecaddrjs'
import { fetchAddressBySubstring } from './addressService'
import { TransactionWithAddressAndPrices, upsertManyTransactionsForAddress } from './transactionService'
import { syncPricesFromTransactionList } from './priceService'

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
    bitcoincash: grpcBCH,
    ecash: new GrpcClient({ url: process.env.GRPC_XEC_NODE_URL })
  }
}

export class GrpcBlockchainClient implements BlockchainClient {
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

  // WIP: this should be private in the future
  public async getTransactionPrismaFromTransaction (transaction: Transaction.AsObject, addressString: string, confirmed: boolean): Promise<TransactionPrisma> {
    return {
      hash: transaction.hash as string,
      amount: await this.getTransactionAmount(transaction, addressString),
      timestamp: transaction.timestamp,
      addressId: 0,
      id: 0,
      confirmed
    }
  }

  public async syncTransactionsAndPricesForAddress (parameters: GetAddressTransactionsParameters): Promise<TransactionWithAddressAndPrices[]> {
    const address = await fetchAddressBySubstring(parameters.addressString)
    const pageSize = FETCH_N
    let totalFetchedConfirmedTransactions = 0
    let page = Math.floor(parameters.start / pageSize)
    let insertedTransactions: TransactionWithAddressAndPrices[] = []

    while (totalFetchedConfirmedTransactions < parameters.maxTransactions) {
      const client = this.getClientForAddress(address.address)
      const transactions = (await client.getAddressTransactions({
        address: address.address,
        nbSkip: page * pageSize,
        nbFetch: pageSize
      })).toObject()

      if (transactions.confirmedTransactionsList.length === 0 && transactions.unconfirmedTransactionsList.length === 0) break

      // remove transactions older than the networks
      const confirmedTransactions = transactions.confirmedTransactionsList.filter(this.txThesholdFilter(address))
      const unconfirmedTransactions = transactions.unconfirmedTransactionsList.map(mempoolTx => this.parseMempoolTx(mempoolTx))
      totalFetchedConfirmedTransactions += confirmedTransactions.length
      page += 1

      if (totalFetchedConfirmedTransactions > parameters.maxTransactions) {
        confirmedTransactions.splice(confirmedTransactions.length - (totalFetchedConfirmedTransactions - parameters.maxTransactions))
      }

      const transactionsToPersist = [
        ...await Promise.all(
          confirmedTransactions.map(async tx => await this.getTransactionPrismaFromTransaction(tx, address.address, true))
        ),
        ...await Promise.all(
          unconfirmedTransactions.map(async tx => await this.getTransactionPrismaFromTransaction(tx, address.address, false))
        )
      ]
      const persistedTransactions = await upsertManyTransactionsForAddress(transactionsToPersist, address)
      await syncPricesFromTransactionList(persistedTransactions)
      insertedTransactions = [...insertedTransactions, ...persistedTransactions]

      await new Promise(resolve => setTimeout(resolve, FETCH_DELAY))
    }

    return insertedTransactions
  };

  public async getUtxos (address: string): Promise<GetAddressUnspentOutputsResponse.AsObject> {
    const client = this.getClientForAddress(address)
    const res = (await client.getAddressUtxos({ address })).toObject()
    return res
  };

  public async getBalance (address: string): Promise<number> {
    const { outputsList } = await this.getUtxos(address)

    let satoshis: number = 0
    outputsList.forEach((x) => {
      satoshis += x.value
    })

    return satoshis
  };

  public async getTransactionDetails (hash: string, networkSlug: string): Promise<GetTransactionResponse.AsObject> {
    const client = this.getClientForNetworkSlug(networkSlug)
    const res = (
      await client.getTransaction({ hash, reversedHashOrder: true })
    ).toObject()
    return res
  };

  public async subscribeTransactions (
    addresses: string[],
    onTransactionNotification: (txn: Transaction.AsObject) => any,
    onMempoolTransactionNotification: (txn: Transaction.AsObject) => any,
    networkSlug: string
  ): Promise<void> {
    const createTxnStream = async (): Promise<void> => {
      const client = this.getClientForNetworkSlug(networkSlug)
      const confirmedStream = await client.subscribeTransactions({
        includeMempoolAcceptance: false,
        includeBlockAcceptance: true,
        addresses
      })
      const unconfirmedStream = await client.subscribeTransactions({
        includeMempoolAcceptance: true,
        includeBlockAcceptance: false,
        addresses
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
        const objectTxn = data.getConfirmedTransaction()!.toObject()
        console.log(`${nowDateString}: got confirmed txn`, objectTxn)
        onTransactionNotification(objectTxn)
      })
      void unconfirmedStream.on('data', (data: TransactionNotification) => {
        const unconfirmedTxn = data.getUnconfirmedTransaction()!.toObject()
        const objectTxn = this.parseMempoolTx(unconfirmedTxn)
        console.log(`${nowDateString}: got unconfirmed txn`, objectTxn)
        onMempoolTransactionNotification(objectTxn)
      })

      console.log(`${nowDateString}: txn data stream established for addresses ${addresses.join(', ')}.`)
    }
    await createTxnStream()
  };
}
