import { ChronikClient, ScriptType, SubscribeMsg, Tx, Utxo, WsConfig, WsEndpoint } from 'chronik-client'
import { encode, decode } from 'ecashaddrjs'
import bs58 from 'bs58'
import { AddressWithTransaction, BlockchainClient, BlockchainInfo, BlockInfo, NodeJsGlobalChronik, TransactionDetails } from './blockchainService'
import { NETWORK_SLUGS, CHRONIK_MESSAGE_CACHE_DELAY, RESPONSE_MESSAGES, XEC_TIMESTAMP_THRESHOLD, XEC_NETWORK_ID, BCH_NETWORK_ID, BCH_TIMESTAMP_THRESHOLD, FETCH_DELAY, FETCH_N, KeyValueT } from 'constants/index'
import { TransactionWithAddressAndPrices, createManyTransactions, deleteTransactions, fetchUnconfirmedTransactions, createTransaction, syncAddresses } from './transactionService'
import { Address, Prisma } from '@prisma/client'
import xecaddr from 'xecaddrjs'
import { groupAddressesByNetwork, satoshisToUnit } from 'utils'
import { fetchAddressBySubstring, fetchAllAddressesForNetworkId, getLatestTxTimestampForAddress, setSyncing, updateLastSynced } from './addressService'
import * as ws from 'ws'
import { BroadcastTxData } from 'ws-service/types'
import config from 'config'
import io, { Socket } from 'socket.io-client'
import moment from 'moment'
import { parseError } from 'utils/validators'
import { executeAddressTriggers } from './triggerService'

interface ProcessedMessages {
  confirmed: KeyValueT<number>
  unconfirmed: KeyValueT<number>
}

export class ChronikBlockchainClient implements BlockchainClient {
  chronik: ChronikClient
  availableNetworks: string[]
  subscribedAddresses: KeyValueT<Address>
  chronikWSEndpoint: WsEndpoint
  wsEndpoint: Socket
  lastProcessedMessages: ProcessedMessages

  constructor () {
    if (process.env.WS_AUTH_KEY === '' || process.env.WS_AUTH_KEY === undefined) {
      throw new Error(RESPONSE_MESSAGES.MISSING_WS_AUTH_KEY_400.message)
    }
    this.chronik = new ChronikClient(config.chronikClientURL)
    this.availableNetworks = [NETWORK_SLUGS.ecash]
    this.subscribedAddresses = {}
    this.chronikWSEndpoint = this.chronik.ws(this.getWsConfig())
    this.lastProcessedMessages = { confirmed: {}, unconfirmed: {} }
    this.wsEndpoint = io(`${config.wsBaseURL}/broadcast`, {
      query: {
        key: process.env.WS_AUTH_KEY
      }
    })
  }

  private clearOldMessages (): void {
    const now = moment()
    for (const key of Object.keys(this.lastProcessedMessages.unconfirmed)) {
      const diff = moment.unix(this.lastProcessedMessages.unconfirmed[key]).diff(now)
      if (diff > CHRONIK_MESSAGE_CACHE_DELAY) {
        const { [key]: _, ...newConfirmed } = this.lastProcessedMessages.confirmed
        this.lastProcessedMessages.confirmed = newConfirmed
      }
    }
    for (const key of Object.keys(this.lastProcessedMessages.confirmed)) {
      const diff = moment.unix(this.lastProcessedMessages.confirmed[key]).diff(now)
      if (diff > CHRONIK_MESSAGE_CACHE_DELAY) {
        const { [key]: _, ...newConfirmed } = this.lastProcessedMessages.confirmed
        this.lastProcessedMessages.confirmed = newConfirmed
      }
    }
  }

  private isAlreadyBeingProcessed (txid: string, confirmed: boolean): boolean {
    this.clearOldMessages()
    if (confirmed) {
      const lt = this.lastProcessedMessages.confirmed[txid]
      if (lt === undefined) {
        this.lastProcessedMessages.confirmed[txid] = moment().unix()
        return false
      }
      return true
    } else {
      const lt = this.lastProcessedMessages.unconfirmed[txid]
      if (lt === undefined) {
        this.lastProcessedMessages.unconfirmed[txid] = moment().unix()
        return false
      }
      return true
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

  public async getPaginatedTxs (addressString: string, page: number, pageSize: number): Promise<Tx[]> {
    const { type, hash160 } = toHash160(addressString)
    return (await this.chronik.script(type, hash160).history(page, pageSize)).txs
  }

  public async * syncTransactionsForAddress (addressString: string): AsyncGenerator<TransactionWithAddressAndPrices[]> {
    const address = await fetchAddressBySubstring(addressString)
    const pageSize = FETCH_N
    let page = 0
    const latestTimestamp = await getLatestTxTimestampForAddress(address.id) ?? 0

    await setSyncing(addressString, true)
    while (true) {
      let transactions = await this.getPaginatedTxs(addressString, page, pageSize)

      // filter out transactions that happened before a certain date set in constants/index,
      //   this date is understood as the beginning and we don't look past it
      transactions = transactions.filter(this.txThesholdFilter(address))

      if (transactions.length === 0) {
        break
      }
      const latestBlockTimestamp = Number(transactions[0].block?.timestamp)
      if (latestBlockTimestamp < latestTimestamp) break

      const confirmedTransactions = transactions.filter(t => t.block !== undefined)
      const unconfirmedTransactions = transactions.filter(t => t.block === undefined)

      page += 1

      const transactionsToPersist = await Promise.all(
        [...confirmedTransactions, ...unconfirmedTransactions].map(async tx => await this.getTransactionFromChronikTransaction(tx, address))
      )

      const persistedTransactions = await createManyTransactions(transactionsToPersist)
      const broadcastTxData: BroadcastTxData = {} as BroadcastTxData
      broadcastTxData.messageType = 'OldTx'
      broadcastTxData.address = addressString
      broadcastTxData.txs = persistedTransactions
      this.wsEndpoint.emit('txs-broadcast', broadcastTxData)
      yield persistedTransactions

      await new Promise(resolve => setTimeout(resolve, FETCH_DELAY))
    }
    await setSyncing(addressString, false)
    await updateLastSynced(addressString)
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
      onError: (e: ws.ErrorEvent) => { console.log(`Chronik webSocket error, type: ${e.type} | message: ${e.message} | error: ${e.error as string}`) },
      onReconnect: (_: ws.Event) => { console.log('Chronik webSocket unexpectedly closed.') },
      onConnect: (_: ws.Event) => { console.log('Chronik webSocket connection (re)established.') },
      onEnd: (e: ws.Event) => { console.log(`Chronik WebSocket ended, type: ${e.type}.`) },
      autoReconnect: true
    }
  }

  private async processWsMessage (msg: SubscribeMsg): Promise<void> {
    // delete unconfirmed transaction from our database
    // if they were cancelled and not confirmed
    if (msg.type === 'RemovedFromMempool') {
      console.log(`[${msg.type}] ${msg.txid}`)
      const transactionsToDelete = await fetchUnconfirmedTransactions(msg.txid)
      try {
        await deleteTransactions(transactionsToDelete)
      } catch (err: any) {
        const parsedError = parseError(err)
        if (parsedError.message !== RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404.message) {
          throw err
        }
      }
    } else if (msg.type === 'AddedToMempool' || msg.type === 'Confirmed') {
      // create unconfirmed or confirmed transaction
      if (this.isAlreadyBeingProcessed(msg.txid, msg.type === 'Confirmed')) {
        return
      }
      console.log(`[${msg.type}] ${msg.txid}`)
      const transaction = await this.chronik.tx(msg.txid)
      const addressesWithTransactions = await this.getAddressesForTransaction(transaction)
      for (const addressWithTransaction of addressesWithTransactions) {
        const { created, tx } = await createTransaction(addressWithTransaction.transaction)
        if (tx !== undefined) {
          const broadcastTxData: BroadcastTxData = {} as BroadcastTxData
          broadcastTxData.address = addressWithTransaction.address.address
          broadcastTxData.messageType = 'NewTx'
          broadcastTxData.txs = [tx]
          try { // emit broadcast for both unconfirmed and confirmed txs
            this.wsEndpoint.emit('txs-broadcast', broadcastTxData)
          } catch (err: any) {
            console.error(RESPONSE_MESSAGES.COULD_NOT_BROADCAST_TX_TO_WS_SERVER_500.message, err.stack)
          }
          if (created) { // only execute trigger for unconfirmed tx arriving
            try {
              await executeAddressTriggers(broadcastTxData)
            } catch (err: any) {
              console.error(RESPONSE_MESSAGES.COULD_NOT_EXECUTE_TRIGGER_500.message, err.stack)
            }
          }
        }
      }
    } else if (msg.type === 'Error') {
      console.log(`[${msg.type}] CODE:${msg.errorCode} ${JSON.stringify(msg.msg)} | isUserError: ${msg.isUserError ? 'yes' : 'no'}`)
    } else {
      console.log(`[${msg.type.toString()}] ${JSON.stringify(msg)}`)
    }
  }

  private async getAddressesForTransaction (transaction: Tx): Promise<AddressWithTransaction[]> {
    const addressesWithTransactions: AddressWithTransaction[] = await Promise.all(Object.values(this.subscribedAddresses).map(
      async address => {
        return {
          address,
          transaction: await this.getTransactionFromChronikTransaction(transaction, address)
        }
      }
    ))
    const zero = new Prisma.Decimal(0)
    return addressesWithTransactions.filter(
      addressWithTransaction => !(zero.equals(addressWithTransaction.transaction.amount as Prisma.Decimal))
    )
  }

  public async subscribeAddresses (addresses: Address[]): Promise<void> {
    if (addresses.length === 0) return

    const addressesAlreadySubscribed = addresses.filter(address => Object.keys(this.subscribedAddresses).includes(address.address))
    addressesAlreadySubscribed.forEach(address => {
      console.log(`This address was already subscribed: ${address.address}`)
    })
    if (addressesAlreadySubscribed.length === addresses.length) return
    addresses = addresses.filter(address => !addressesAlreadySubscribed.includes(address))

    const addressesByNetwork: KeyValueT<Address[]> = groupAddressesByNetwork(this.availableNetworks, addresses)

    for (const [, networkAddresses] of Object.entries(addressesByNetwork)) {
      networkAddresses.forEach(address => {
        const { type, hash160 } = toHash160(address.address)
        console.log('subbing', address.address)
        this.chronikWSEndpoint.subscribe(type, hash160)
        this.subscribedAddresses[address.address] = address
      })
    }
  }

  public async syncMissedTransactions (): Promise<void> {
    const addresses = await fetchAllAddressesForNetworkId(XEC_NETWORK_ID)
    try {
      const { failedAddressesWithErrors } = await syncAddresses(addresses)
      Object.keys(failedAddressesWithErrors).forEach((addr) => {
        console.error(`When syncing missing addresses for address ${addr} encountered error: ${failedAddressesWithErrors[addr]}`)
      })
    } catch (err: any) {
      console.error(`ERROR: (skipping anyway) initial missing transactions sync failed: ${err.message as string} ${err.stack as string}`)
    }
  }

  public async subscribeInitialAddresses (): Promise<void> {
    const addresses = await fetchAllAddressesForNetworkId(XEC_NETWORK_ID)
    try {
      await this.subscribeAddresses(addresses)
    } catch (err: any) {
      console.error(`ERROR: (skipping anyway) initial chronik subscription failed: ${err.message as string} ${err.stack as string}`)
    }
  }
}

export function fromHash160 (type: string, hash160: string): string {
  const buffer = Buffer.from(hash160, 'hex')

  // Because ecashaddrjs only accepts Uint8Array as input type, convert
  const hash160ArrayBuffer = new ArrayBuffer(buffer.length)
  const hash160Uint8Array = new Uint8Array(hash160ArrayBuffer)
  for (let i = 0; i < hash160Uint8Array.length; i += 1) {
    hash160Uint8Array[i] = buffer[i]
  }

  return encode(
    'ecash',
    type.toUpperCase(),
    hash160Uint8Array
  )
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

  return fromHash160(addressType, hash160)
}

export interface SubbedAddressesLog {
  registeredSubscriptions: string[]
  currentSubscriptions: string[]
  different: boolean
}

export function getSubbedAddresses (): SubbedAddressesLog {
  const chronik = (global as unknown as NodeJsGlobalChronik).chronik
  const ret = {} as any
  ret.registeredSubscriptions = Object.keys(chronik.subscribedAddresses)
  const asAny = chronik as any // To access private properties
  ret.currentSubscriptions = asAny.chronikWSEndpoint._subs.map((sub: any) => fromHash160(sub.scriptType, sub.scriptPayload))
  ret.different = currentSubscriptionsDifferentThanRegistered(ret.registeredSubscriptions, ret.currentSubscriptions)
  return ret
}

function currentSubscriptionsDifferentThanRegistered (registeredSubscriptions: string[], currentSubscriptions: string[]): boolean {
  if (registeredSubscriptions.length !== currentSubscriptions.length) return true

  for (let i = 0; i < registeredSubscriptions.length; i++) {
    if (registeredSubscriptions[i] !== currentSubscriptions[i]) return true
  }

  return false
}
