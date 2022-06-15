import {
  Transaction,
  UnspentOutput,
  GetTransactionResponse,
  GetAddressTransactionsResponse,
  GetAddressUnspentOutputsResponse
} from 'grpc-bchrpc-node'
import rewire from 'rewire'
const bchdService = rewire('../../services/bchdService')

const unspentOutputFromObject = (obj: UnspentOutput.AsObject): UnspentOutput => {
  const uo = new UnspentOutput()
  uo.setPubkeyScript(obj.pubkeyScript)
  uo.setValue(obj.value)
  uo.setIsCoinbase(obj.isCoinbase)
  uo.setBlockHeight(obj.blockHeight)
  return uo
}

const transactionFromObject = (obj: Transaction.AsObject): Transaction => {
  const t = new Transaction()
  t.setHash(obj.hash)
  t.setVersion(obj.version)
  t.setLockTime(obj.lockTime)
  t.setSize(obj.size)
  t.setTimestamp(obj.timestamp)
  t.setConfirmations(obj.confirmations)
  t.setBlockHeight(obj.blockHeight)
  t.setBlockHash(obj.blockHash)
  return t
}

const grpcMock = {
  getAddressTransactions: (_: object) => {
    const res = new GetAddressTransactionsResponse()
    const t1 = transactionFromObject({
      hash: 'LUZSpMOab+ZYlyQNxF0XasKpArgQAX633LoA5CBPGgE=',
      version: 1,
      lockTime: 0,
      size: 219,
      timestamp: 1653460454,
      confirmations: 60,
      blockHeight: 741620,
      blockHash: 'jzSPV4kkI3x5Fdoow/ei3f7Zit+oGMYCAAAAAAAAAAA=',
      inputsList: [],
      outputsList: []
    })
    const t2 = transactionFromObject({
      hash: 'jiZHfE+AohEJglMO29nQ5aTR6F/n4Om2whzEZUiXcHk=',
      version: 2,
      lockTime: 0,
      size: 225,
      timestamp: 1653459437,
      confirmations: 61,
      blockHeight: 741619,
      blockHash: 'A6kjJsl4gaVrY0Z15k0SoRzfKv0Fis8EAAAAAAAAAAA=',
      inputsList: [],
      outputsList: []
    })
    res.setConfirmedTransactionsList([t1, t2])
    return res
  },
  getAddressUtxos: (_: object) => {
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
  },
  getTransaction: (_: object) => {
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

bchdService.__set__('grpc', grpcMock)

describe('Test service returned objects consistency', () => {
  it('test getAddress', async () => {
    const res = await bchdService.getAddress('mockaddress')
    expect(res).toEqual(expect.objectContaining({
      confirmedTransactionsList: expect.arrayContaining([
        {
          hash: 'LUZSpMOab+ZYlyQNxF0XasKpArgQAX633LoA5CBPGgE=',
          version: 1,
          inputsList: [],
          outputsList: [],
          lockTime: 0,
          size: 219,
          timestamp: 1653460454,
          confirmations: 60,
          blockHeight: 741620,
          blockHash: 'jzSPV4kkI3x5Fdoow/ei3f7Zit+oGMYCAAAAAAAAAAA='
        },
        {
          hash: 'jiZHfE+AohEJglMO29nQ5aTR6F/n4Om2whzEZUiXcHk=',
          version: 2,
          inputsList: [],
          outputsList: [],
          lockTime: 0,
          size: 225,
          timestamp: 1653459437,
          confirmations: 61,
          blockHeight: 741619,
          blockHash: 'A6kjJsl4gaVrY0Z15k0SoRzfKv0Fis8EAAAAAAAAAAA='
        }
      ])
    }))
  })
  it('test getUtxos', async () => {
    const res = await bchdService.getUtxos('mockaddress')
    expect(res).toEqual(expect.objectContaining({
      outputsList: expect.arrayContaining([
        {
          outpoint: undefined,
          pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
          value: 547,
          isCoinbase: false,
          blockHeight: 684161
        },
        {
          pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
          value: 122,
          isCoinbase: false,
          blockHeight: 657711
        },
        expect.objectContaining({
          pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
          value: 1111,
          isCoinbase: false,
          blockHeight: 596627
        })
      ])
    }))
  })
  it('test getBCHBalance', async () => {
    const res = await bchdService.getBCHBalance('mockaddress')
    expect(res).toBe(1780)
  })
  it('test getTransactionDetails', async () => {
    const res = await bchdService.getTransactionDetails('mockaddress')
    expect(res).toEqual(expect.objectContaining({
      transaction: {
        hash: 'hu9m3BZg/zlxis7ehc0x/+9qELXC8dkbimOtc5v598s=',
        version: 2,
        inputsList: [],
        outputsList: [],
        lockTime: 0,
        size: 518,
        timestamp: 1653653100,
        confirmations: 0,
        blockHeight: 0,
        blockHash: ''
      }
    }))
  })
})
