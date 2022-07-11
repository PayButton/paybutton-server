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

export const mockedPaybuttonAddress = {
  id: 1,
  address: 'qpuzcemdv2hhng4fpyjxzfp0axsyltrghutla9rfnm',
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z'),
  chainId: 1,
  paybuttonId: 1
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
  paybuttonAddressId: 1,
  amount: '431247724',
  timestamp: 1657130467
}

// BCH GRPC
const unspentOutputFromObject = (obj: UnspentOutput.AsObject): UnspentOutput => {
  const uo = new UnspentOutput()
  uo.setPubkeyScript(obj.pubkeyScript)
  uo.setValue(obj.value)
  uo.setIsCoinbase(obj.isCoinbase)
  uo.setBlockHeight(obj.blockHeight)
  return uo
}

const outputFromObject = (obj: Transaction.Output.AsObject): Transaction.Output => {
  const out = new Transaction.Output()
  out.setIndex(obj.index)
  out.setValue(obj.value)
  out.setPubkeyScript(obj.pubkeyScript)
  out.setAddress(obj.address)
  out.setScriptClass(obj.scriptClass)
  out.setDisassembledScript(obj.disassembledScript)
  return out
}

const inputFromObject = (obj: Transaction.Input.AsObject): Transaction.Input => {
  const inp = new Transaction.Input()
  inp.setIndex(obj.index)
  inp.setSignatureScript(obj.signatureScript)
  inp.setSequence(obj.sequence)
  inp.setValue(obj.value)
  inp.setPreviousScript(obj.previousScript)
  inp.setAddress(obj.address)
  return inp
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
  t.setOutputsList(obj.outputsList.map((out) => outputFromObject(out)))
  t.setInputsList(obj.inputsList.map((inp) => inputFromObject(inp)))
  return t
}

export const mockedGrpc = {
  transaction1: transactionFromObject({
    hash: 'LUZSpMOab+ZYlyQNxF0XasKpArgQAX633LoA5CBPGgE=',
    version: 1,
    lockTime: 0,
    size: 219,
    timestamp: 1653460454,
    confirmations: 60,
    blockHeight: 741620,
    blockHash: 'jzSPV4kkI3x5Fdoow/ei3f7Zit+oGMYCAAAAAAAAAAA=',
    inputsList: [],
    outputsList: [{
      index: 0,
      value: 431247724,
      pubkeyScript: 'dqkUeCxnbWKveaKpCSRhJC/poE+saL+IrA==',
      address: mockedPaybuttonAddress.address,
      scriptClass: 'pubkeyhash',
      disassembledScript: 'OP_DUP OP_HASH160 782c676d62af79a2a9092461242fe9a04fac68bf OP_EQUALVERIFY OP_CHECKSIG'
    }, {
      index: 1,
      value: 227413293,
      pubkeyScript: 'dqkUokKnAjaab8AVlPxzrrxk1aRq4BOIrA==',
      address: 'qz3y9fczx6dxlsq4jn788t4uvn26g6hqzvrczjuzz2',
      scriptClass: 'pubkeyhash',
      disassembledScript: 'OP_DUP OP_HASH160 a242a702369a6fc01594fc73aebc64d5a46ae013 OP_EQUALVERIFY OP_CHECKSIG'
    }]
  }),
  transaction2: transactionFromObject({
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
  }),
  getAddressTransactions: (_: object) => {
    const res = new GetAddressTransactionsResponse()
    res.setConfirmedTransactionsList([mockedGrpc.transaction1, mockedGrpc.transaction2])
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
