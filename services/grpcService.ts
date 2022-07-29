import {
  GrpcClient,
  TransactionNotification,
  Transaction,
  GetTransactionResponse,
  GetAddressTransactionsResponse,
  GetAddressUnspentOutputsResponse,
} from 'grpc-bchrpc-node'

import { getAddressPrefix } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'

let grpcXEC = new GrpcClient({ url: process.env.GRPC_XEC_NODE_URL });
let grpcBCH = new GrpcClient({ url: process.env.GRPC_NODE_URL });

export const getClientForAddress = (addressString: string): GrpcClient => {
  const prefix = getAddressPrefix(addressString)
  if (prefix === 'ecash') {
    return grpcXEC
  } else if (prefix === 'bitcoincash' ) {
    return grpcBCH
  } else {
    throw new Error(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  }
}

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
  const client = getClientForAddress(address)
  return (await client.getAddressTransactions({ address })).toObject();
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

    txnStream.on('end', async (error: any) => {
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
