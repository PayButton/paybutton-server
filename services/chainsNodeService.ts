import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

const BASE_PROTO_PATH = `${process.cwd()}/services`
const BCH_PROTO_PATH = `${BASE_PROTO_PATH}/chainsNodeBitcoinCashRpc.proto`
const BCH_GRPC_NODE_URL = process.env.GRPC_NODE_URL || 'bchd.fountainhead.cash:443'

const PROTO_PATHS = {
			'BCH': BCH_PROTO_PATH
}

const buildClient = blockchainSlug => {
	const packageDefinition = protoLoader.loadSync(
		PROTO_PATHS[blockchainSlug],
		{
			keepCase: true,
			longs: String,
			enums: String,
			defaults: true,
			oneofs: true,
		})
	const protoBuf: any = grpc.loadPackageDefinition(packageDefinition).pb
	const client: any = new protoBuf.bchrpc(BCH_GRPC_NODE_URL, grpc.credentials.createSsl())
	return client
}

const bitcoinCashRpcClient = buildClient('BCH')

export const getAddressTransactions = async ( address: string ) => {
  const response: any = await(await new Promise((resolve, reject) => {
		const req = { address }
		bitcoinCashRpcClient.getAddressTransactions(req, (err, data) => {
			if (err !== null) { reject(err); } else { resolve(data!) }
		})
	}))
	return response
}
