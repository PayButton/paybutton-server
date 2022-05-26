import {
  GrpcClient,
  TransactionNotification,
  Transaction,
  GetTransactionResponse,
  GetAddressTransactionsResponse,
  GetAddressUnspentOutputsResponse,
} from 'grpc-bchrpc-node';
const rewire = require("rewire");
const bchdService = rewire('./bchdService');

const transactionFromObject = function ({
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
    });
    const t2 = transactionFromObject({
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
  }
}

bchdService.__set__("grpc", grpcMock)

it('test getAddress', async () => {
  const x = await bchdService.getAddress('qqflxa58acalnc4n62dgp7efnmn572cx7gpx63gafk')
  console.log(x)
});
