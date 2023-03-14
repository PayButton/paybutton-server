import { ChronikClient, ScriptType, Tx, TxHistoryPage, Utxo } from 'chronik-client'
import { encode, decode } from 'ecashaddrjs'
import bs58 from 'bs58'
import { BlockchainClient, BlockchainInfo, BlockInfo } from './blockchainService'
import { Transaction } from 'grpc-bchrpc-node'
import { NETWORK_SLUGS, RESPONSE_MESSAGES, CHRONIK_CLIENT_URL } from 'constants/index'

export class ChronikBlockchainClient implements BlockchainClient {
  chronik: ChronikClient
  availableNetworks: string[]

  constructor () {
    this.chronik = new ChronikClient(CHRONIK_CLIENT_URL)
    this.availableNetworks = [NETWORK_SLUGS.ecash]
  }

  private validateNetwork (networkSlug: string): void {
    if (!this.availableNetworks.includes(networkSlug)) { throw new Error(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.message) }
  }

  async getBlockchainInfo (networkSlug: string): Promise<BlockchainInfo> {
    this.validateNetwork(networkSlug)
    const blockchainInfo = await this.chronik.blockchainInfo()
    return { height: blockchainInfo.tipHeight, hash: blockchainInfo.tipHash }
  }

  async getBlockInfo (networkSlug: string, height: number): Promise<BlockInfo> {
    this.validateNetwork(networkSlug)
    const blockInfo = (await this.chronik.block(height)).blockInfo
    return { hash: blockInfo.hash, height: blockInfo.height, timestamp: parseInt(blockInfo.timestamp) }
  }

  async getUtxos (address: string): Promise<Utxo[]> {
    const { type, hash160 } = toHash160(address)
    const scriptsUtxos = await this.chronik.script(type, hash160).utxos()
    return scriptsUtxos.reduce<Utxo[]>((acc, scriptUtxos) => [...acc, ...scriptUtxos.utxos], [])
  }

  public async getBalance (address: string): Promise<number> {
    const utxos = await this.getUtxos(address)
    return utxos.reduce((acc, utxo) => acc + parseInt(utxo.value), 0)
  }

  // anti-chronological order
  async getAddressTransactions (address: string, page?: number, pageSize?: number): Promise<TxHistoryPage> {
    const { type, hash160 } = toHash160(address)
    return await this.chronik.script(type, hash160).history(page, pageSize)
  }

  async getTransactionDetails (txId: string): Promise<Tx> {
    return await this.chronik.tx(txId)
  }

  async subscribeTransactions (addresses: string[], onTransactionNotification: (txn: Transaction.AsObject) => any, onMempoolTransactionNotification: (txn: Transaction.AsObject) => any, networkSlug: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
}

export function toHash160 (address: string): {type: ScriptType, hash160: string} {
  try {
    // decode address hash
    const { type, hash } = decode(address)
    // encode the address hash to legacy format (bitcoin)
    const legacyAdress = bs58.encode(hash)
    // convert legacy to hash160
    const addrHash160 = Buffer.from(bs58.decode(legacyAdress)).toString(
      'hex'
    )
    return { type: type.toLowerCase() as ScriptType, hash160: addrHash160 }
  } catch (err) {
    console.log('Error converting address to hash160')
    throw err
  }
}

export function outputScriptToAddress (outputScript: String): string | boolean {
  // returns P2SH or P2PKH address
  // P2PKH addresses are in outputScript of type 76a914...88ac
  // P2SH addresses are in outputScript of type a914...87
  // Return false if cannot determine P2PKH or P2SH address

  const typeTestSlice = outputScript.slice(0, 4)
  let addressType
  let hash160
  switch (typeTestSlice) {
    case '76a9':
      addressType = 'P2PKH'
      hash160 = outputScript.substring(
        outputScript.indexOf('76a914') + '76a914'.length,
        outputScript.lastIndexOf('88ac')
      )
      break
    case 'a914':
      addressType = 'P2SH'
      hash160 = outputScript.substring(
        outputScript.indexOf('a914') + 'a914'.length,
        outputScript.lastIndexOf('87')
      )
      break
    default:
      return false
  }

  // Test hash160 for correct length
  if (hash160.length !== 40) {
    return false
  }

  const buffer = Buffer.from(hash160, 'hex')

  // Because ecashaddrjs only accepts Uint8Array as input type, convert
  const hash160ArrayBuffer = new ArrayBuffer(buffer.length)
  const hash160Uint8Array = new Uint8Array(hash160ArrayBuffer)
  for (let i = 0; i < hash160Uint8Array.length; i += 1) {
    hash160Uint8Array[i] = buffer[i]
  }

  // Encode ecash: address
  const ecashAddress = encode(
    'ecash',
    addressType,
    hash160Uint8Array
  )

  return ecashAddress
}
