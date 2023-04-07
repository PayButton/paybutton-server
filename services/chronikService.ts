import { ChronikClient, ScriptType, Tx } from 'chronik-client'
import { encode, decode } from 'ecashaddrjs'
import bs58 from 'bs58'
import { BlockchainClient, BlockchainInfo, BlockInfo, GetAddressTransactionsParameters } from './blockchainService'
import { GetAddressUnspentOutputsResponse, GetTransactionResponse, Transaction } from 'grpc-bchrpc-node'
import { NETWORK_SLUGS, RESPONSE_MESSAGES, CHRONIK_CLIENT_URL, XEC_TIMESTAMP_THRESHOLD, XEC_NETWORK_ID, BCH_NETWORK_ID, BCH_TIMESTAMP_THRESHOLD, FETCH_DELAY, FETCH_N } from 'constants/index'
import { TransactionWithAddressAndPrices, upsertManyTransactionsForAddress } from './transactionService'
import { Address, Prisma } from '@prisma/client'
import xecaddr from 'xecaddrjs'
import { satoshisToUnit } from 'utils'
import { fetchAddressBySubstring } from './addressService'
import { syncPricesFromTransactionList } from './priceService'

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

  private txThesholdFilter (address: Address) {
    return (t: Tx, index: number, array: Tx[]): boolean => {
      return (
        t.block === undefined ||
        (parseInt(t.block?.timestamp) >= XEC_TIMESTAMP_THRESHOLD && address.networkId === XEC_NETWORK_ID) ||
        (parseInt(t.block?.timestamp) >= BCH_TIMESTAMP_THRESHOLD && address.networkId === BCH_NETWORK_ID)
      )
    }
  }

  private async getTransactionAmount (transaction: Tx, addressString: string): Promise<Prisma.Decimal> {
    let totalOutput = 0
    let totalInput = 0
    const addressFormat = xecaddr.detectAddressFormat(addressString)
    const script = toHash160(addressString).hash160

    for (const output of transaction.outputs) {
      if (output.outputScript.includes(script)) {
        totalOutput += parseInt(output.value)
      }
    }
    for (const input of transaction.inputs) {
      if (input?.outputScript?.includes(script) === true) {
        totalInput += parseInt(input.value)
      }
    }
    const satoshis = new Prisma.Decimal(totalOutput).minus(totalInput)
    return await satoshisToUnit(
      satoshis,
      addressFormat
    )
  }

  private async getTransactionFromChronikTransaction (transaction: Tx, address: Address): Promise<Prisma.TransactionUncheckedCreateInput> {
    return {
      hash: transaction.txid,
      amount: await this.getTransactionAmount(transaction, address.address),
      timestamp: transaction.block !== undefined ? parseInt(transaction.block.timestamp) : parseInt(transaction.timeFirstSeen),
      addressId: address.id,
      confirmed: transaction.block !== undefined
    }
  }

  public async syncTransactionsAndPricesForAddress (parameters: GetAddressTransactionsParameters): Promise<TransactionWithAddressAndPrices[]> {
    const address = await fetchAddressBySubstring(parameters.addressString)
    const pageSize = FETCH_N
    let totalFetchedConfirmedTransactions = 0
    let page = Math.floor(parameters.start / pageSize)
    let insertedTransactions: TransactionWithAddressAndPrices[] = []

    while (totalFetchedConfirmedTransactions < parameters.maxTransactionsToReturn) {
      const { type, hash160 } = toHash160(address.address)
      let transactions = (await this.chronik.script(type, hash160).history(page, pageSize)).txs

      // remove transactions older than the networks
      transactions = transactions.filter(this.txThesholdFilter(address))

      if (transactions.length === 0) break

      const confirmedTransactions = transactions.filter(t => t.block !== undefined)
      const unconfirmedTransactions = transactions.filter(t => t.block === undefined)

      totalFetchedConfirmedTransactions += confirmedTransactions.length
      page += 1

      if (totalFetchedConfirmedTransactions > parameters.maxTransactionsToReturn) {
        confirmedTransactions.splice(confirmedTransactions.length - (totalFetchedConfirmedTransactions - parameters.maxTransactionsToReturn))
      }

      const transactionsToPersist = await Promise.all(
        [...confirmedTransactions, ...unconfirmedTransactions].map(async tx => await this.getTransactionFromChronikTransaction(tx, address))
      )

      const persistedTransactions = await upsertManyTransactionsForAddress(transactionsToPersist, address)
      await syncPricesFromTransactionList(persistedTransactions)
      insertedTransactions = [...insertedTransactions, ...persistedTransactions]

      await new Promise(resolve => setTimeout(resolve, FETCH_DELAY))
    }

    return insertedTransactions
  }

  async getUtxos (address: string): Promise<GetAddressUnspentOutputsResponse.AsObject> {
    throw new Error('Method not implemented.')
  }

  async getTransactionDetails (hash: string, networkSlug: string): Promise<GetTransactionResponse.AsObject> {
    throw new Error('Method not implemented.')
  }

  async subscribeTransactions (addresses: string[], onTransactionNotification: (txn: Transaction.AsObject) => any, onMempoolTransactionNotification: (txn: Transaction.AsObject) => any, networkSlug: string): Promise<void> {
    throw new Error('Method not implemented.')
  }

  public async getBalance (address: string): Promise<number> {
    const { type, hash160 } = toHash160(address)
    const utxos = await this.chronik.script(type, hash160).utxos()

    let totalSatoshis = 0
    // we should always get only one element since we have only one hash above
    if (utxos.length > 0) {
      for (const u of utxos[0].utxos) { totalSatoshis += parseInt(u.value) }
    }

    return totalSatoshis
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
