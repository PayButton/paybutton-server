import {
  GrpcClient,
  TransactionNotification,
  Transaction,
  GetTransactionResponse,
  GetAddressTransactionsResponse,
  GetAddressUnspentOutputsResponse,
  GetBlockchainInfoResponse,
  GetBlockInfoResponse
} from 'grpc-bchrpc-node'

import { BlockchainClient, GetAddressParameters } from './blockchainService'
import { getObjectForNetworkSlug, getObjectForAddress } from '../utils/index'
import { parseMempoolTx } from 'services/transactionService'
import { KeyValueT } from '../constants/index'

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
    return getObjectForAddress(addressString, this.clients)
  }

  private getClientForNetworkSlug (networkSlug: string): GrpcClient {
    return getObjectForNetworkSlug(networkSlug, this.clients)
  }

  public async getBlockchainInfo (networkSlug: string): Promise<GetBlockchainInfoResponse.AsObject> {
    const client = this.getClientForNetworkSlug(networkSlug)
    return (await client.getBlockchainInfo()).toObject()
  };

  public async getBlockInfo (networkSlug: string, height: number): Promise<GetBlockInfoResponse.AsObject> {
    const client = this.getClientForNetworkSlug(networkSlug)
    return (await client.getBlockInfo({ index: height })).toObject()
  };

  public async getAddress (parameters: GetAddressParameters): Promise<GetAddressTransactionsResponse.AsObject> {
    const client = this.getClientForAddress(parameters.address)
    return (await client.getAddressTransactions(parameters)).toObject()
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
        const objectTxn = parseMempoolTx(unconfirmedTxn)
        console.log(`${nowDateString}: got unconfirmed txn`, objectTxn)
        onMempoolTransactionNotification(objectTxn)
      })

      console.log(`${nowDateString}: txn data stream established for addresses ${addresses.join(', ')}.`)
    }
    await createTxnStream()
  };
}
