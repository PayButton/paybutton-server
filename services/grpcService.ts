import {
  GrpcClient
} from 'grpc-bchrpc-node'

import { BlockchainClient, BlockchainInfo, BlockInfo } from './blockchainService'
import { getObjectValueForNetworkSlug, getObjectValueForAddress } from '../utils/index'
import { KeyValueT, RESPONSE_MESSAGES } from '../constants/index'
import { Tx, TxHistoryPage, Utxo, SubscribeMsg, WsEndpoint } from 'chronik-client'
import * as ws from 'ws'

export interface OutputsList {
  outpoint: object
  pubkeyScript: string
  value: number
  isCoinbase: boolean
  blockHeight: number
  slpToken: string | undefined
}

export class GrpcBlockchainClient implements BlockchainClient {
  clients: KeyValueT<GrpcClient>

  constructor () {
    this.clients = {
      bitcoincash: new GrpcClient({ url: process.env.GRPC_BCH_NODE_URL }),
      ecash: new GrpcClient({ url: process.env.GRPC_XEC_NODE_URL })
    }
  }

  private getClientForAddress (addressString: string): GrpcClient {
    return getObjectValueForAddress(addressString, this.clients)
  }

  private getClientForNetworkSlug (networkSlug: string): GrpcClient {
    return getObjectValueForNetworkSlug(networkSlug, this.clients)
  }

  public async getBlockchainInfo (networkSlug: string): Promise<BlockchainInfo> {
    const client = this.getClientForNetworkSlug(networkSlug)
    const blockchainInfo = (await client.getBlockchainInfo()).toObject()
    return { height: blockchainInfo.bestHeight, hash: blockchainInfo.bestBlockHash }
  };

  public async getBlockInfo (networkSlug: string, height: number): Promise<BlockInfo> {
    const client = this.getClientForNetworkSlug(networkSlug)
    const blockInfo = (await client.getBlockInfo({ index: height })).toObject()?.info
    if (blockInfo === undefined) { throw new Error(RESPONSE_MESSAGES.COULD_NOT_GET_BLOCK_INFO.message) }
    return { hash: blockInfo.hash, height: blockInfo.height, timestamp: blockInfo.timestamp }
  };

  // DEPRECATED
  public async getAddressTransactions (address: string, page?: number, pageSize?: number): Promise<TxHistoryPage> {
    throw new Error('Method not implemented.')
    // const client = this.getClientForAddress(parameters.address)
    // return (await client.getAddressTransactions(parameters)).toObject()
  };

  // DEPRECATED
  public async getUtxos (address: string): Promise<Utxo[]> {
    throw new Error('Method not implemented.')
    // const client = this.getClientForAddress(address)
    // const res = (await client.getAddressUtxos({ address })).toObject()
    // return res
  };

  // DEPRECATED
  public async getBalance (address: string): Promise<number> {
    throw new Error('Method not implemented.')
    // const { outputsList } = await this.getUtxos(address)

    // let satoshis: number = 0
    // outputsList.forEach((x) => {
    //   satoshis += x.value
    // })

    // return satoshis
  };

  // DEPRECATED
  public async getTransactionDetails (txId: string): Promise<Tx> {
    throw new Error('Method not implemented.')
    // const client = this.getClientForNetworkSlug(networkSlug)
    // const res = (
    //   await client.getTransaction({ hash, reversedHashOrder: true })
    // ).toObject()
    // return res
  };

  // DEPRECATED
  public async subscribeTransactions (
    addresses: string[],
    onMessage: (msg: SubscribeMsg) => void,
    onConnect?: (e: ws.Event) => void,
    onError?: (e: ws.ErrorEvent) => void,
    onEnd?: (e: ws.Event) => void
  ): Promise<WsEndpoint> {
    throw new Error('Method not implemented.')
    // const createTxnStream = async (): Promise<void> => {
    //   const client = this.getClientForNetworkSlug(networkSlug)
    //   const confirmedStream = await client.subscribeTransactions({
    //     includeMempoolAcceptance: false,
    //     includeBlockAcceptance: true,
    //     addresses
    //   })
    //   const unconfirmedStream = await client.subscribeTransactions({
    //     includeMempoolAcceptance: true,
    //     includeBlockAcceptance: false,
    //     addresses
    //   })

    //   const nowDateString = (new Date()).toISOString()

    //   // output for end, error or close of stream
    //   void confirmedStream.on('end', () => {
    //     console.log(`${nowDateString}: addresses ${addresses.join(', ')} confirmed stream ended`)
    //   })
    //   void confirmedStream.on('close', () => {
    //     console.log(`${nowDateString}: addresses ${addresses.join(', ')} confirmed stream closed`)
    //   })
    //   void confirmedStream.on('error', (error: any) => {
    //     console.log(`${nowDateString}: addresses ${addresses.join(', ')} confirmed stream error`, error)
    //   })
    //   void unconfirmedStream.on('end', () => {
    //     console.log(`${nowDateString}: addresses ${addresses.join(', ')} unconfirmed stream ended`)
    //   })
    //   void unconfirmedStream.on('close', () => {
    //     console.log(`${nowDateString}: addresses ${addresses.join(', ')} unconfirmed stream closed`)
    //   })
    //   void unconfirmedStream.on('error', (error: any) => {
    //     console.log(`${nowDateString}: addresses ${addresses.join(', ')} unconfirmed stream error`, error)
    //   })

    //   // output for data stream
    //   void confirmedStream.on('data', (data: TransactionNotification) => {
    //     const objectTxn = data.getConfirmedTransaction()!.toObject()
    //     console.log(`${nowDateString}: got confirmed txn`, objectTxn)
    //     onTransactionNotification(objectTxn)
    //   })
    //   void unconfirmedStream.on('data', (data: TransactionNotification) => {
    //     const unconfirmedTxn = data.getUnconfirmedTransaction()!.toObject()
    //     const objectTxn = parseMempoolTx(unconfirmedTxn)
    //     console.log(`${nowDateString}: got unconfirmed txn`, objectTxn)
    //     onMempoolTransactionNotification(objectTxn)
    //   })

    //   console.log(`${nowDateString}: txn data stream established for addresses ${addresses.join(', ')}.`)
    // }
    // await createTxnStream()
  };
}
