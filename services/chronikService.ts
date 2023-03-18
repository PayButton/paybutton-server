import { ChronikClient, ScriptType, SubscribeMsg, Tx, TxHistoryPage, Utxo, WsConfig, WsEndpoint } from 'chronik-client'
import { encode, decode } from 'ecashaddrjs'
import bs58 from 'bs58'
import { BlockchainClient, BlockchainInfo, BlockInfo, Transfer, TransfersResponse } from './blockchainService'
import { NETWORK_SLUGS, RESPONSE_MESSAGES, CHRONIK_CLIENT_URL, FETCH_N, BCH_NETWORK_ID, BCH_TIMESTAMP_THRESHOLD, XEC_NETWORK_ID, XEC_TIMESTAMP_THRESHOLD, FETCH_DELAY } from 'constants/index'
import { Prisma, Address } from '@prisma/client'
import xecaddr from 'xecaddrjs'
import { satoshisToUnit } from 'utils/index'
import * as transactionService from './transactionService'
import * as ws from 'ws'

export class ChronikBlockchainClient implements BlockchainClient {
  chronik: ChronikClient
  availableNetworks: string[]
  wsEndpoint: WsEndpoint
  subscribedAdresses: Address[]

  constructor () {
    this.chronik = new ChronikClient(CHRONIK_CLIENT_URL)
    this.availableNetworks = [NETWORK_SLUGS.ecash]
    this.subscribedAdresses = []
    this.wsEndpoint = this.chronik.ws(this.getWsConfig())
  }

  private getWsConfig (): WsConfig {
    return {
      onConnect: (e: ws.Event) => { console.log(`WebSocket connected: ${e.type} (type)`) },
      onMessage: (msg: SubscribeMsg) => { void this.processWsMessage(msg) },
      onError: (e: ws.ErrorEvent) => { console.log(`WebSocket error: ${e.type} (type) | ${e.message} (message) | ${e.error as string} (error)`) },
      onEnd: (e: ws.Event) => { console.log(`WebSocket ended: ${e.type} (type)`) },
      autoReconnect: true
    }
  }

  private async processWsMessage (msg: SubscribeMsg): Promise<void> {
    // create unconfirmed transaction
    if (msg.type === 'AddedToMempool') {
      const transaction = await this.getTransactionDetails(msg.txid)
      const transfers = await this.getTransfersSubscribedAddressesFromTransaction(transaction)
      await Promise.all(
        transfers.map(async transfer => await transactionService.upsertTransaction(transfer, false))
      )
    }
    // delete msg.txid from our database
    if (msg.type === 'RemovedFromMempool') {
      console.log('a')
    }
    // change confirmed to true if already in our database, else, create a confirmed transaction
    if (msg.type === 'Confirmed') {
      console.log('a')
    }
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

  private async getTransferFromTransaction (transaction: Tx, address: Address): Promise<Transfer> {
    return {
      address,
      txid: transaction.txid,
      receivedAmount: await this.getTransactionAmount(transaction, address.address),
      timestamp: transaction.block !== undefined ? parseInt(transaction.block.timestamp) : parseInt(transaction.timeFirstSeen)
    }
  }

  private async getTransfersSubscribedAddressesFromTransaction (transaction: Tx): Promise<Transfer[]> {
    const transfers = await Promise.all(this.subscribedAdresses.map(
      async address => await this.getTransferFromTransaction(transaction, address)
    ))
    return transfers.filter(transfer => transfer.receivedAmount !== new Prisma.Decimal(0))
  }

  // fetches in anti-chronological order
  public async getAddressTransfers (address: Address, maxTransfers?: number): Promise<TransfersResponse> {
    maxTransfers = maxTransfers ?? Infinity
    const pageSize = FETCH_N
    let newTransactionsCount = -1
    let page = 0
    const confirmedTransactions: Tx[] = []
    const unconfirmedTransactions: Tx[] = []

    while (confirmedTransactions.length < maxTransfers && newTransactionsCount !== 0) {
      const { type, hash160 } = toHash160(address.address)
      let transactions = (await this.chronik.script(type, hash160).history(page, pageSize)).txs

      // remove transactions older than the networks
      transactions = transactions.filter(this.txThesholdFilter(address))
      confirmedTransactions.push(...transactions.filter(t => t.block !== undefined))
      unconfirmedTransactions.push(...transactions.filter(t => t.block === undefined))

      newTransactionsCount = transactions.length
      page += 1

      await new Promise(resolve => setTimeout(resolve, FETCH_DELAY))
    }

    confirmedTransactions.splice(maxTransfers)

    return {
      confirmed: await Promise.all(confirmedTransactions.map(async tx => await this.getTransferFromTransaction(tx, address))),
      unconfirmed: await Promise.all(unconfirmedTransactions.map(async tx => await this.getTransferFromTransaction(tx, address)))
    }
  }

  // anti-chronological order
  async getAddressTransactions (address: string, page?: number, pageSize?: number): Promise<TxHistoryPage> {
    const { type, hash160 } = toHash160(address)
    return await this.chronik.script(type, hash160).history(page, pageSize)
  }

  async getTransactionDetails (txId: string): Promise<Tx> {
    return await this.chronik.tx(txId)
  }

  async subscribeAddressesAddTransactions (addresses: Address[]): Promise<void> {
    if (addresses.length === 0) throw new Error(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message)

    addresses.forEach(address => {
      const { type, hash160 } = toHash160(address.address)
      this.wsEndpoint.subscribe(type, hash160)
      this.subscribedAdresses.push(address)
    })
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
