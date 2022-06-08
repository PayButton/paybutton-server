import {
  GrpcClient,
  TransactionNotification,
  Transaction,
  UnspentOutput,
  GetTransactionResponse,
  GetAddressTransactionsResponse,
  GetAddressUnspentOutputsResponse,
  ClientReadableStream,
} from 'grpc-bchrpc-node';
const rewire = require("rewire");
const bchdService = rewire('./bchdService');

class Factory {
  static unspentOutputFromObject  ({
    pubkeyScript,
    value,
    isCoinbase,
    blockHeight,
    slpToken,
  }) {
    const uo = new UnspentOutput()
    uo.setPubkeyScript(pubkeyScript);
    uo.setValue(value);
    uo.setIsCoinbase(isCoinbase);
    uo.setBlockHeight(blockHeight);
    uo.setSlpToken(slpToken);
    return uo
  }

  static transactionFromObject  ({
    hash,
    version,
    lockTime,
    size,
    timestamp,
    confirmations,
    blockHeight,
    blockHash,
  }) {
    const t = new Transaction()
    t.setHash(hash);
    t.setVersion(version);
    t.setLockTime(lockTime);
    t.setSize(size);
    t.setTimestamp(timestamp);
    t.setConfirmations(confirmations);
    t.setBlockHeight(blockHeight);
    t.setBlockHash(blockHash);
    return t
  }
}


const grpcMock = {
  getAddressTransactions: (_: object) => {
    const res = new GetAddressTransactionsResponse()
    const t1 = Factory.transactionFromObject({
        hash: 'LUZSpMOab+ZYlyQNxF0XasKpArgQAX633LoA5CBPGgE=',
        version: 1,
        lockTime: 0,
        size: 219,
        timestamp: 1653460454,
        confirmations: 60,
        blockHeight: 741620,
        blockHash: 'jzSPV4kkI3x5Fdoow/ei3f7Zit+oGMYCAAAAAAAAAAA=',
    });
    const t2 = Factory.transactionFromObject({
        hash: 'jiZHfE+AohEJglMO29nQ5aTR6F/n4Om2whzEZUiXcHk=',
        version: 2,
        lockTime: 0,
        size: 225,
        timestamp: 1653459437,
        confirmations: 61,
        blockHeight: 741619,
        blockHash: 'A6kjJsl4gaVrY0Z15k0SoRzfKv0Fis8EAAAAAAAAAAA=',
    });
    res.setConfirmedTransactionsList([t1, t2])
    return res
  },
  getAddressUtxos: (_: object) => {
    const res = new GetAddressUnspentOutputsResponse()
    res.setOutputsList([
        Factory.unspentOutputFromObject({
          pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
          value: 547,
          isCoinbase: false,
          blockHeight: 684161,
          slpToken: undefined
        }),
        Factory.unspentOutputFromObject({
          pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
          value: 122,
          isCoinbase: false,
          blockHeight: 657711,
          slpToken: undefined
        }),
        Factory.unspentOutputFromObject({
          pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
          value: 1111,
          isCoinbase: false,
          blockHeight: 596627,
          slpToken: undefined
        })
      ]);
    return res
  },
  getTransaction: (_: object) => {
    const res = new GetTransactionResponse()
    res.setTransaction(Factory.transactionFromObject({
      hash: 'hu9m3BZg/zlxis7ehc0x/+9qELXC8dkbimOtc5v598s=',
      version: 2,
      lockTime: 0,
      size: 518,
      timestamp: 1653653100,
      confirmations: 0,
      blockHeight: 0,
      blockHash: '',
    }));
    return res
  }
};


bchdService.__set__("grpc", grpcMock)

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
          blockHash: 'jzSPV4kkI3x5Fdoow/ei3f7Zit+oGMYCAAAAAAAAAAA=',
          slpTransactionInfo: undefined
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
          blockHash: 'A6kjJsl4gaVrY0Z15k0SoRzfKv0Fis8EAAAAAAAAAAA=',
          slpTransactionInfo: undefined
        },
      ])
    }));
  });
  it('test getUtxos', async () => {
    const res = await bchdService.getUtxos('mockaddress')
    expect(res).toEqual(expect.objectContaining({
      outputsList: expect.arrayContaining([
        {
          outpoint: undefined,
          pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
          value: 547,
          isCoinbase: false,
          blockHeight: 684161,
          slpToken: undefined
        },
        {
          pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
          value: 122,
          isCoinbase: false,
          blockHeight: 657711,
          slpToken: undefined
        },
        expect.objectContaining({
          pubkeyScript: 'dqkUYF1GSq6KqSQSKPbQtcOJWRBPEFaIrA==',
          value: 1111,
          isCoinbase: false,
          blockHeight: 596627,
          slpToken: undefined
        })
      ])
    }));
  });
  it('test getBCHBalance', async () => {
    const res = await bchdService.getBCHBalance('mockaddress')
    expect(res).toBe(1780);
  });
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
        blockHash: '',
        slpTransactionInfo: undefined
      }
    }));
  });
});
