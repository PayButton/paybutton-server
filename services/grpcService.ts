import {
  GrpcClient,
  TransactionNotification,
  Transaction,
  GetTransactionResponse,
  GetAddressTransactionsResponse,
  GetAddressUnspentOutputsResponse,
} from 'grpc-bchrpc-node'

import { getAddressPrefix } from '../utils/index'
import { RESPONSE_MESSAGES } from '../constants/index'

let grpcBCH = new GrpcClient({ url: process.env.GRPC_BCH_NODE_URL });

export const getClientForAddress = (addressString: string): GrpcClient => {
  const prefix = getAddressPrefix(addressString)
  if (prefix === 'ecash') {
    return new GrpcClient({ url: process.env.GRPC_XEC_NODE_URL });
  } else if (prefix === 'bitcoincash' ) {
    return grpcBCH
  } else {
    throw new Error(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  }
}

export const getClientForNetworkSlug = (networkSlug: string): GrpcClient => {
  if (networkSlug === 'ecash') {
    return new GrpcClient({ url: process.env.GRPC_XEC_NODE_URL });
  } else if (networkSlug === 'bitcoincash' ) {
    return grpcBCH
  } else {
    throw new Error(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.message)
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
  const client = getClientForAddress(address)
  const res = (await client.getAddressUtxos({ address })).toObject();
  return res;
};

export const getBCHBalance = async (address: string): Promise<number> => {
  const { outputsList } = await getUtxos(address);

  let satoshis: number = 0;
  outputsList.forEach((x) => {
    satoshis += x.value;
  });

  return satoshis;
};

export const getTransactionDetails = async (
  hash: string,
  networkSlug: string,
): Promise<GetTransactionResponse.AsObject> => {
  const client = getClientForNetworkSlug(networkSlug)
  const res = (
    await client.getTransaction({ hash, reversedHashOrder: true })
  ).toObject();
  return res;
};

export const Subscribe = async (
  addresses: string[],
  onTransactionNotification: (txn: Transaction.AsObject) => any,
  networkSlug: string,
): Promise<void> => {
  const createTxnStream = async (): Promise<void> => {
    const client = getClientForNetworkSlug(networkSlug)
    const txnStream = await client.subscribeTransactions({
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
