import {
  GrpcClient,
  TransactionNotification,
  Transaction,
  GetTransactionResponse,
  GetAddressTransactionsResponse,
  GetAddressUnspentOutputsResponse,
} from 'grpc-bchrpc-node';

let grpc = new GrpcClient({ url: process.env.GRPC_NODE_URL });

export interface OutputsList {
  outpoint: object;
  pubkeyScript: string;
  value: number;
  isCoinbase: boolean;
  blockHeight: number;
  slpToken: string | undefined;
}

export const getAddress = async (
  address: string
): Promise<GetAddressTransactionsResponse.AsObject> => {
  const res = await (await grpc.getAddressTransactions({ address })).toObject();
  return res;
};

export const getUtxos = async (
  address: string
): Promise<GetAddressUnspentOutputsResponse.AsObject> => {
  const res = await (await grpc.getAddressUtxos({ address })).toObject();
  return res;
};

export const getBCHBalance = async (address: string): Promise<number> => {
  const { outputsList } = await getUtxos(address);

  let satoshis: number = 0;
  outputsList.map((x) => {
    satoshis += x.value;
  });

  return satoshis;
};

export const getTransactionDetails = async (
  hash: string
): Promise<GetTransactionResponse.AsObject> => {
  const res = await (
    await grpc.getTransaction({ hash, reversedHashOrder: true })
  ).toObject();
  return res;
};

export const Subscribe = async (
  addresses: string[],
  onTransactionNotification: (txn: Transaction.AsObject) => any
) => {
  const createTxnStream = async () => {
    const txnStream = await grpc.subscribeTransactions({
      includeMempoolAcceptance: true,
      includeBlockAcceptance: false,
      includeSerializedTxn: false,
      addresses: addresses,
    });

    txnStream.on('end', async (error) => {
      console.log('stream ended', error);
    });

    txnStream.on('data', async (data: TransactionNotification) => {
      let txn = data.getUnconfirmedTransaction()!.getTransaction()!;
      onTransactionNotification(txn.toObject());
    });
    console.log(`txn data stream established.`);
  };
  await createTxnStream();
};

export default {
  getAddress,
  getUtxos,
  Subscribe,
  getBCHBalance,
  getTransactionDetails,
};
