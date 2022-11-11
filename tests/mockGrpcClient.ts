import { mockedGrpc, unspentOutputFromObject, transactionFromObject } from './mockedObjects'
import {
  GetTransactionResponse,
  GetAddressTransactionsResponse,
  GetAddressUnspentOutputsResponse
} from 'grpc-bchrpc-node'

export default class MockGrpcClient {
  private _checkNetworkIntegrity = false

  public get checkNetworkIntegrity (): boolean {
    return this._checkNetworkIntegrity
  }

  public set checkNetworkIntegrity (value) {
    this._checkNetworkIntegrity = value
  }

  getAddressTransactions (_: any): GetAddressTransactionsResponse {
    const res = new GetAddressTransactionsResponse()
    if (_.nbSkip > 0) {
      res.setConfirmedTransactionsList([])
    } else {
      res.setConfirmedTransactionsList([mockedGrpc.transaction1, mockedGrpc.transaction2])
    }
    return res
  }

  getAddressUtxos (_: object): GetAddressUnspentOutputsResponse {
    const res = new GetAddressUnspentOutputsResponse()
    res.setOutputsList([
      unspentOutputFromObject({
        pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
        value: 547,
        isCoinbase: false,
        blockHeight: 684161
      }),
      unspentOutputFromObject({
        pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
        value: 122,
        isCoinbase: false,
        blockHeight: 657711
      }),
      unspentOutputFromObject({
        pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
        value: 1111,
        isCoinbase: false,
        blockHeight: 596627
      })
    ])
    return res
  }

  getTransaction (_: object): GetTransactionResponse {
    const res = new GetTransactionResponse()
    res.setTransaction(transactionFromObject({
      hash: 'hu9m3BZg/zlxis7ehc0x/+9qELXC8dkbimOtc5v598s=',
      version: 2,
      lockTime: 0,
      size: 518,
      timestamp: 1653653100,
      confirmations: 0,
      blockHeight: 0,
      blockHash: '',
      inputsList: [],
      outputsList: []
    }))
    return res
  }
}
