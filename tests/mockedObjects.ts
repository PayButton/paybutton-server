// Paybutton
// GRPC-BCHRPC
import {
  Transaction,
  UnspentOutput,
  GetTransactionResponse,
  GetAddressTransactionsResponse,
  GetAddressUnspentOutputsResponse
} from 'grpc-bchrpc-node'

export const mockedPaybutton = {
  id: 4,
  providerUserId: 'mocked-uid',
  name: 'mocked-name',
  buttonData: 'mockedData',
  uuid: '730bfa24-eb57-11ec-b722-0242ac150002',
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z'),
  addresses: [
    {
      id: 1,
      address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
      createdAt: new Date('2022-05-27T15:18:42.000Z'),
      updatedAt: new Date('2022-05-27T15:18:42.000Z'),
      chainId: 1,
      paybuttonId: 1
    },
    {
      id: 2,
      address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
      createdAt: new Date('2022-05-27T15:18:42.000Z'),
      updatedAt: new Date('2022-05-27T15:18:42.000Z'),
      chainId: 2,
      paybuttonId: 1
    }
  ]
}

export const mockedPaybuttonList = [
  {
    id: 1,
    providerUserId: 'mocked-uid',
    name: 'mocked-name-1',
    buttonData: 'mockedData',
    uuid: '730bfa24-eb57-11ec-b722-0242ac150002',
    createdAt: new Date('2022-05-27T15:18:42.000Z'),
    updatedAt: new Date('2022-05-27T15:18:42.000Z'),
    addresses: [
      {
        id: 1,
        address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        chainId: 1,
        paybuttonId: 1
      },
      {
        id: 2,
        address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        chainId: 2,
        paybuttonId: 1
      }
    ]
  },
  {
    id: 2,
    providerUserId: 'mocked-uid',
    name: 'mocked-name-2',
    buttonData: 'mockedData',
    uuid: '133fb8aa-eb57-11ec-b722-0242ac150002',
    createdAt: new Date('2022-05-27T15:18:42.000Z'),
    updatedAt: new Date('2022-05-27T15:18:42.000Z'),
    addresses: [
      {
        id: 3,
        address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        chainId: 1,
        paybuttonId: 2
      },
      {
        id: 4,
        address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        chainId: 2,
        paybuttonId: 2
      }
    ]
  }
]

// Chain
export const mockedChain = {
  id: 1,
  slug: 'bitcoincash',
  ticker: 'bch',
  title: 'Bitcoin Cash',
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z')
}

// Transaction
export const mockedTransaction = {
  id: 1,
  hash: 'Yh5DRDjd3AarAvQA1nwpPI4daDihY6hQfnMV6UKFqZc=',
  amount: '431247724',
  timestamp: 1657130467
}

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

export const mockedGrpc = {
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
