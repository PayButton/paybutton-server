import {
  GrpcClient,
  TransactionNotification,
  Transaction,
  GetTransactionResponse,
  GetAddressTransactionsResponse,
  GetAddressUnspentOutputsResponse,
  GetBlockchainInfoResponse,
  GetBlockInfoResponse
} from 'grpc-bchrpc-node'

import { getAddressPrefix } from '../utils/index'
import { RESPONSE_MESSAGES, NETWORK_SLUGS } from '../constants/index'

let grpcBCH = new GrpcClient({ url: process.env.GRPC_BCH_NODE_URL });

export const getClientForAddress = (addressString: string): GrpcClient => {
  const prefix = getAddressPrefix(addressString)
  if (prefix === NETWORK_SLUGS.ecash) {
    return new GrpcClient({ url: process.env.GRPC_XEC_NODE_URL });
  } else if (prefix === NETWORK_SLUGS.bitcoincash) {
    return grpcBCH
  } else {
    throw new Error(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  }
}

export const getClientForNetworkSlug = (networkSlug: string): GrpcClient => {
  if (networkSlug === NETWORK_SLUGS.ecash) {
    return new GrpcClient({ url: process.env.GRPC_XEC_NODE_URL });
  } else if (networkSlug === NETWORK_SLUGS.bitcoincash) {
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

interface GetAddressParameters {
  address: string
  nbSkip?: number
  nbFetch?: number
  height?: number
  hash?: string
  reversedHashOrder?: boolean
}

export const getBlockchainInfo = async (networkSlug: string): Promise<GetBlockchainInfoResponse.AsObject> => {
  const client = getClientForNetworkSlug(networkSlug)
  return (await client.getBlockchainInfo()).toObject();
};

export const getBlockInfo = async (networkSlug: string, height: number): Promise<GetBlockInfoResponse.AsObject> => {
  const client = getClientForNetworkSlug(networkSlug)
  return (await client.getBlockInfo({index: height})).toObject();
};

export const getAddress = async (
  parameters: GetAddressParameters
): Promise<GetAddressTransactionsResponse.AsObject> => {
  const client = getClientForAddress(parameters.address)
  return (await client.getAddressTransactions(parameters)).toObject();
};

export const getUtxos = async (
  address: string
): Promise<GetAddressUnspentOutputsResponse.AsObject> => {
  const client = getClientForAddress(address)
  const res = (await client.getAddressUtxos({ address })).toObject();
  return res;
};

export const getBalance = async (address: string): Promise<number> => {
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

export const subscribeTransactions = async (
  addresses: string[],
  onTransactionNotification: (txn: Transaction.AsObject) => any,
  networkSlug: string,
): Promise<void> => {
  const createTxnStream = async (): Promise<void> => {
    const client = getClientForNetworkSlug(networkSlug)
    const txnStream = await client.subscribeTransactions({
      //includeMempoolAcceptance: true,
      includeBlockAcceptance: true,
      //includeSerializedTxn: false,
      addresses: addresses,
    });

    txnStream.on('end', async (error: any) => {
      console.log('stream ended', error);
    });

    txnStream.on('data', async (data: TransactionNotification) => {
      let txn = data.getConfirmedTransaction()!;
      onTransactionNotification(txn.toObject());
    });
    console.log(`txn data stream established.`);
  };
  await createTxnStream();
};

export default {
  getAddress,
  getUtxos,
  subscribeTransactions,
  getBalance,
  getTransactionDetails,
};
