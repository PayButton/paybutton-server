import { ChronikClient, ScriptType, SubscribeMsg, Tx, Utxo, WsConfig, WsEndpoint } from 'chronik-client'
import { encode, decode } from 'ecashaddrjs'
import bs58 from 'bs58'
import { AddressWithTransaction, BlockchainClient, BlockchainInfo, BlockInfo, GetAddressTransactionsParameters, TransactionDetails } from './blockchainService'
import { NETWORK_SLUGS, RESPONSE_MESSAGES, CHRONIK_CLIENT_URL, XEC_TIMESTAMP_THRESHOLD, XEC_NETWORK_ID, BCH_NETWORK_ID, BCH_TIMESTAMP_THRESHOLD, FETCH_DELAY, FETCH_N, KeyValueT } from 'constants/index'
import { TransactionWithAddressAndPrices, createManyTransactions, base64HashToHex, deleteTransactions, fetchUnconfirmedTransactions, createTransaction } from './transactionService'
import { Address, Prisma } from '@prisma/client'
import xecaddr from 'xecaddrjs'
import { groupAddressesByNetwork, satoshisToUnit } from 'utils'
import { fetchAddressBySubstring } from './addressService'
import * as ws from 'ws'
import { BroadcastTxData, broadcastTxInsertion } from 'sse-service/client'

export class ChronikBlockchainClient implements BlockchainClient {
  chronik: ChronikClient
  availableNetworks: string[]
  subscribedAddresses: KeyValueT<Address>
  wsEndpoint: WsEndpoint

  constructor () {
    this.chronik = new ChronikClient(CHRONIK_CLIENT_URL)
    this.availableNetworks = [NETWORK_SLUGS.ecash]
    this.subscribedAddresses = {}
    this.wsEndpoint = this.chronik.ws(this.getWsConfig())
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
      hash: await base64HashToHex(transaction.txid),
      amount: await this.getTransactionAmount(transaction, address.address),
      timestamp: transaction.block !== undefined ? parseInt(transaction.block.timestamp) : parseInt(transaction.timeFirstSeen),
      addressId: address.id,
      confirmed: transaction.block !== undefined
    }
  }

  public async syncTransactionsForAddress (parameters: GetAddressTransactionsParameters): Promise<TransactionWithAddressAndPrices[]> {
    const address = await fetchAddressBySubstring(parameters.addressString)
    const pageSize = FETCH_N
    let totalFetchedConfirmedTransactions = 0
    let page = Math.floor(parameters.start / pageSize)
    let insertedTransactions: TransactionWithAddressAndPrices[] = []

    while (totalFetchedConfirmedTransactions < parameters.maxTransactionsToReturn) {
      const { type, hash160 } = toHash160(address.address)
      let transactions = (await this.chronik.script(type, hash160).history(page, pageSize)).txs

      // filter out transactions that happened before a certain date set in constants/index,
      //   this date is understood as the beginning and we don't look past it
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

      const persistedTransactions = await createManyTransactions(transactionsToPersist)
      insertedTransactions = [...insertedTransactions, ...persistedTransactions]

      await new Promise(resolve => setTimeout(resolve, FETCH_DELAY))
    }

    return insertedTransactions
  }

  private async getUtxos (address: string): Promise<Utxo[]> {
    const { type, hash160 } = toHash160(address)
    const scriptsUtxos = await this.chronik.script(type, hash160).utxos()
    return scriptsUtxos.reduce<Utxo[]>((acc, scriptUtxos) => [...acc, ...scriptUtxos.utxos], [])
  }

  public async getBalance (address: string): Promise<number> {
    const utxos = await this.getUtxos(address)
    return utxos.reduce((acc, utxo) => acc + parseInt(utxo.value), 0)
  }

  async getTransactionDetails (hash: string, networkSlug: string): Promise<TransactionDetails> {
    const tx = await this.chronik.tx(hash)

    const details: TransactionDetails = {
      hash: tx.txid,
      version: tx.version,
      block: {
        hash: tx.block?.hash,
        height: tx.block?.height,
        timestamp: tx.block?.timestamp
      },
      inputs: [],
      outputs: []
    }
    for (const input of tx.inputs) {
      details.inputs.push({
        value: new Prisma.Decimal(input.value),
        address: outputScriptToAddress(input.outputScript)
      })
    }
    for (const output of tx.outputs) {
      details.outputs.push({
        value: new Prisma.Decimal(output.value),
        address: outputScriptToAddress(output.outputScript)
      })
    }
    return details
  }

  private getWsConfig (): WsConfig {
    return {
      onMessage: (msg: SubscribeMsg) => { void this.processWsMessage(msg) },
      onError: (e: ws.ErrorEvent) => { console.log(`WebSocket error, message type: ${e.type} | message: ${e.message} | error: ${e.error as string}`) },
      onEnd: (e: ws.Event) => { console.log(`WebSocket ended, message type: ${e.type}`) },
      autoReconnect: true
    }
  }

  private async processWsMessage (msg: SubscribeMsg): Promise<void> {
    // delete unconfirmed transaction from our database
    if (msg.type === 'RemovedFromMempool' || msg.type === 'Confirmed') {
      const transactionsToDelete = await fetchUnconfirmedTransactions(msg.txid)
      await deleteTransactions(transactionsToDelete)
    }
    // create unconfirmed or confirmed transaction
    if (msg.type === 'AddedToMempool' || msg.type === 'Confirmed') {
      const transaction = await this.chronik.tx(msg.txid)
      const addressesWithTransactions = await this.getPrismaTransactionsForSubscribedAddresses(transaction)
      const insertedTxs: BroadcastTxData = {}
      await Promise.all(
        addressesWithTransactions.map(async addressWithTransaction => {
          const tx = await createTransaction(addressWithTransaction.transaction)
          if (tx !== undefined) {
            insertedTxs[addressWithTransaction.address.address] = tx
          }
          return tx
        })
      )
      await broadcastTxInsertion(insertedTxs)
    }
  }

  private async getPrismaTransactionsForSubscribedAddresses (transaction: Tx): Promise<AddressWithTransaction[]> {
    const addressesWithTransactions: AddressWithTransaction[] = await Promise.all(Object.values(this.subscribedAddresses).map(
      async address => {
        return {
          address,
          transaction: await this.getTransactionFromChronikTransaction(transaction, address)
        }
      }
    ))
    return addressesWithTransactions.filter(
      addressWithTransaction => addressWithTransaction.transaction.amount > new Prisma.Decimal(0)
    )
  }

  public async subscribeAddressesAddTransactions (addresses: Address[]): Promise<void> {
    if (addresses.length === 0) return

    const addressesAlreadySubscribed = addresses.filter(address => Object.keys(this.subscribedAddresses).includes(address.address))
    if (addressesAlreadySubscribed.length === addresses.length) return
    addressesAlreadySubscribed.forEach(address => {
      console.log(`This address was already subscribed: ${address.address}`)
    })
    addresses = addresses.filter(address => !addressesAlreadySubscribed.includes(address))

    const addressesByNetwork: KeyValueT<Address[]> = groupAddressesByNetwork(this.availableNetworks, addresses)

    for (const [, networkAddresses] of Object.entries(addressesByNetwork)) {
      networkAddresses.forEach(address => {
        const { type, hash160 } = toHash160(address.address)
        this.wsEndpoint.subscribe(type, hash160)
        this.subscribedAddresses[address.address] = address
      })
    }
  }
}

export function toHash160 (address: string): {type: ScriptType, hash160: string} {
  try {
    const { type, hash } = decode(address)
    const legacyAdress = bs58.encode(hash)
    const addrHash160 = Buffer.from(bs58.decode(legacyAdress)).toString(
      'hex'
    )
    return { type: type.toLowerCase() as ScriptType, hash160: addrHash160 }
  } catch (err) {
    console.log('Error converting address to hash160')
    throw err
  }
}

// returns P2SH (type 76a914...88ac) or P2PKH (type a914...87) address
export function outputScriptToAddress (outputScript: string | undefined): string | undefined {
  if (outputScript === undefined) return undefined

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
      return undefined
  }

  if (hash160.length !== 40) return undefined

  const buffer = Buffer.from(hash160, 'hex')

  // Because ecashaddrjs only accepts Uint8Array as input type, convert
  const hash160ArrayBuffer = new ArrayBuffer(buffer.length)
  const hash160Uint8Array = new Uint8Array(hash160ArrayBuffer)
  for (let i = 0; i < hash160Uint8Array.length; i += 1) {
    hash160Uint8Array[i] = buffer[i]
  }

  const ecashAddress = encode(
    'ecash',
    addressType,
    hash160Uint8Array
  )

  return ecashAddress
}
