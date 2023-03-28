import {
  Transaction,
  UnspentOutput
} from 'grpc-bchrpc-node'
import { mockedBCHAddress } from '../mockedObjects'

export const unspentOutputFromObject = (obj: UnspentOutput.AsObject): UnspentOutput => {
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

export const transactionFromObject = (obj: Transaction.AsObject): Transaction => {
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
    inputsList: [
      {
        index: 0,
        outpoint: { hash: 'NTkmyHCk82XbV43ew+Ev8mSN6hSF1SNPv2q+9MEVQNw=', index: 2 },
        signatureScript: 'RzBEAiATvPHhB2XZSDBh4qPKGbpZnthiP7b6F5nNq0jl9e9segIgQb/p7YKnBcAkXrn1ePKRQOCb3CS2TqjLl55Q46xLA7FBIQI+0YnB1MWonyW6U8ydXQbD46v80yMEO61nvbuLGgeMlA==',
        sequence: 4294967295,
        value: 5179951,
        previousScript: 'dqkUsDxLgAuwV19sDxHhVVQcwGYaj5qIrA==',
        address: 'qzcrcjuqpwc9whmvpug7z425rnqxvx50ngl60rrjst',
        slpToken: undefined
      },
      {
        index: 1,
        outpoint: { hash: 'cnPvSV4O12UwKBSyPX9RoD+xem14XBlcUFhklAowLjE=', index: 1 },
        signatureScript: 'RzBEAiBVcKX1SZ08kwIvKt+CJCFcq2AMPuJh9xNoZPbFCBtO8AIgDcTg6dy/l8+Se0hD5Fb6zXhaVLZi9JyShl3qlChlCF5BIQNVw6/pYXrkj4YXjrHuzGDWysHPUCvUVptjbOmlkVmamA==',
        sequence: 4294967295,
        value: 546,
        previousScript: 'dqkUi4A+rsJZAKFsCtIAF8coYnYGLEqIrA==',
        address: 'qz9cq04wcfvspgtvptfqq9789p38vp3vfgt3y66gue',
        slpToken: {
          tokenId: 'MS4wCpRkWFBcGVx4bXqxP6BRfz2yFCgwZdcOXknvc3I=',
          amount: '1',
          isMintBaton: false,
          address: 'qz9cq04wcfvspgtvptfqq9789p38vp3vfg820p0gz8',
          decimals: 0,
          slpAction: 10,
          tokenType: 65
        }
      }
    ],
    outputsList: [{
      index: 0,
      value: 431247724,
      pubkeyScript: 'dqkUeCxnbWKveaKpCSRhJC/poE+saL+IrA==',
      address: mockedBCHAddress.address,
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
    inputsList: [
      {
        index: 0,
        outpoint: { hash: 'NTkmyHCk82XbV43ew+Ev8mSN6hSF1SNPv2q+9MEVQNw=', index: 2 },
        signatureScript: 'RzBEAiATvPHhB2XZSDBh4qPKGbpZnthiP7b6F5nNq0jl9e9segIgQb/p7YKnBcAkXrn1ePKRQOCb3CS2TqjLl55Q46xLA7FBIQI+0YnB1MWonyW6U8ydXQbD46v80yMEO61nvbuLGgeMlA==',
        sequence: 4294967295,
        value: 5179951,
        previousScript: 'dqkUsDxLgAuwV19sDxHhVVQcwGYaj5qIrA==',
        address: 'qzcrcjuqpwc9whmvpug7z425rnqxvx50ngl60rrjst',
        slpToken: undefined
      },
      {
        index: 1,
        outpoint: { hash: 'cnPvSV4O12UwKBSyPX9RoD+xem14XBlcUFhklAowLjE=', index: 1 },
        signatureScript: 'RzBEAiBVcKX1SZ08kwIvKt+CJCFcq2AMPuJh9xNoZPbFCBtO8AIgDcTg6dy/l8+Se0hD5Fb6zXhaVLZi9JyShl3qlChlCF5BIQNVw6/pYXrkj4YXjrHuzGDWysHPUCvUVptjbOmlkVmamA==',
        sequence: 4294967295,
        value: 546,
        previousScript: 'dqkUi4A+rsJZAKFsCtIAF8coYnYGLEqIrA==',
        address: mockedBCHAddress.address,
        slpToken: {
          tokenId: 'MS4wCpRkWFBcGVx4bXqxP6BRfz2yFCgwZdcOXknvc3I=',
          amount: '1',
          isMintBaton: false,
          address: 'qz9cq04wcfvspgtvptfqq9789p38vp3vfg820p0gz8',
          decimals: 0,
          slpAction: 10,
          tokenType: 65
        }
      }
    ],
    outputsList: []
  })
}
