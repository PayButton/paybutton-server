import {
  GrpcClient,
  TransactionNotification,
  Transaction,
  GetTransactionResponse,
  GetAddressTransactionsResponse,
} from 'grpc-bchrpc-node';
const grpc = new GrpcClient();

export interface OutputsList {
  outpoint: object;
  pubkeyScript: string;
  value: number;
  isCoinbase: boolean;
  blockHeight: number;
  slpToken: string | undefined;
}

export interface Network {
  SendTransaction(txnHex: string, callback?: () => any): Promise<string>;
  GetTransaction(txid: string): Promise<GetTransactionResponse>;
  GetAddressTransactions(
    address: string,
    sinceBlock?: number
  ): Promise<GetAddressTransactionsResponse>;
  Subscribe(
    addresses: string[],
    onTransactionNotification: (txn: Transaction) => any
  ): Promise<void>;
}

export const getAddress = async (address: string) => {
  const res = await (await grpc.getAddressTransactions({ address })).toObject();
  return res;
};

export const getUtxos = async (address: string) => {
  const res = await (await grpc.getAddressUtxos({ address })).toObject();
  return res;
};

export const getBCHBalance = async (address: string) => {
  const { outputsList } = await getUtxos(address);

  let satoshis: number = 0;
  outputsList.map((x) => {
    satoshis += x.value;
  });

  return satoshis;
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
};
