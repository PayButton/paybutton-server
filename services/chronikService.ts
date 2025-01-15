import { BlockInfo_InNode, ChronikClientNode, ScriptType_InNode, ScriptUtxo_InNode, Tx_InNode, WsConfig_InNode, WsEndpoint_InNode, WsMsgClient, WsSubScriptClient } from 'chronik-client'
import { encode, decode } from 'ecashaddrjs'
import bs58 from 'bs58'
import { AddressWithTransaction, BlockchainInfo, BlockInfo, TransactionDetails, ProcessedMessages, SubbedAddressesLog, SyncAndSubscriptionReturn } from 'types/chronikTypes'
import { CHRONIK_MESSAGE_CACHE_DELAY, RESPONSE_MESSAGES, XEC_TIMESTAMP_THRESHOLD, XEC_NETWORK_ID, BCH_NETWORK_ID, BCH_TIMESTAMP_THRESHOLD, FETCH_DELAY, FETCH_N, KeyValueT, NETWORK_IDS_FROM_SLUGS, SOCKET_MESSAGES, NETWORK_IDS, NETWORK_TICKERS, MainNetworkSlugsType } from 'constants/index'
import { productionAddresses } from 'prisma/seeds/addresses'
import {
  TransactionWithAddressAndPrices,
  createManyTransactions,
  deleteTransactions,
  fetchUnconfirmedTransactions,
  createTransaction,
  getSimplifiedTransactions,
  getSimplifiedTrasaction,
  connectAllTransactionsToPrices
} from './transactionService'
import { Address, Prisma } from '@prisma/client'
import xecaddr from 'xecaddrjs'
import { getAddressPrefix, satoshisToUnit } from 'utils/index'
import { fetchAddressBySubstring, fetchAddressesArray, fetchAllAddressesForNetworkId, getEarliestUnconfirmedTxTimestampForAddress, getLatestConfirmedTxTimestampForAddress, setSyncing, updateLastSynced } from './addressService'
import * as ws from 'ws'
import { BroadcastTxData } from 'ws-service/types'
import config from 'config'
import io, { Socket } from 'socket.io-client'
import moment from 'moment'
import { OpReturnData, parseError, parseOpReturnData } from 'utils/validators'
import { executeAddressTriggers } from './triggerService'
import { appendTxsToFile } from 'prisma/seeds/transactions'
import { PHASE_PRODUCTION_BUILD } from 'next/dist/shared/lib/constants'
import { syncPastDaysNewerPrices } from './priceService'

const decoder = new TextDecoder()

export function getNullDataScriptData (outputScript: string): OpReturnData | null {
  if (outputScript.length < 2 || outputScript.length % 2 !== 0) {
    throw new Error(RESPONSE_MESSAGES.INVALID_OUTPUT_SCRIPT_LENGTH_500(outputScript.length).message)
  }
  const opReturnCode = '6a'
  const encodedProtocolPushData = '04' // '\x04'
  const encodedProtocol = '50415900' // 'PAY\x00'

  const prefixLen = (
    opReturnCode.length +
    encodedProtocolPushData.length +
    encodedProtocol.length +
    2 // version byte
  )

  const regexPattern = new RegExp(
    `${opReturnCode}${encodedProtocolPushData}${encodedProtocol}.{2}`,
    'i'
  )

  if (!regexPattern.test(outputScript.slice(0, prefixLen))) {
    return null
  }

  let dataStartIndex = prefixLen + 2

  if (outputScript.length < dataStartIndex) {
    return null
  }

  let dataPushDataHex = outputScript.slice(prefixLen, dataStartIndex)
  if (dataPushDataHex.toLowerCase() === '4c') {
    dataStartIndex = dataStartIndex + 2
    dataPushDataHex = outputScript.slice(prefixLen + 2, dataStartIndex)
  }
  const dataPushData = parseInt(dataPushDataHex, 16)
  if (outputScript.length < dataStartIndex + dataPushData * 2) {
    return null
  }

  const dataHexBuffer = Buffer.from(
    outputScript.slice(dataStartIndex, dataStartIndex + dataPushData * 2),
    'hex'
  )
  const dataString = decoder.decode(dataHexBuffer)

  const ret: OpReturnData = {
    rawMessage: dataString,
    message: parseOpReturnData(dataString),
    paymentId: ''
  }

  const paymentIdPushDataIndex = dataStartIndex + dataPushData * 2
  const paymentIdStartIndex = paymentIdPushDataIndex + 2
  const hasPaymentId = outputScript.length >= paymentIdStartIndex
  if (!hasPaymentId) {
    return ret
  }

  const paymentIdPushDataHex = outputScript.slice(paymentIdPushDataIndex, paymentIdStartIndex)
  const paymentIdPushData = parseInt(paymentIdPushDataHex, 16)
  let paymentIdString = ''
  if (outputScript.length < paymentIdStartIndex + paymentIdPushData * 2) {
    return ret
  }
  for (let i = 0; i < paymentIdPushData; i++) {
    const hexByte = outputScript.slice(paymentIdStartIndex + (i * 2), paymentIdStartIndex + (i * 2) + 2)
    // we don't decode the hex for the paymentId, since those are just random bytes.
    paymentIdString += hexByte
  }
  ret.paymentId = paymentIdString

  return ret
}

export class ChronikBlockchainClient {
  chronik: ChronikClientNode
  networkId: number
  networkSlug: string
  chronikWSEndpoint: WsEndpoint_InNode
  confirmedTxsHashesFromLastBlock: string[]
  wsEndpoint: Socket
  CHRONIK_MSG_PREFIX: string
  lastProcessedMessages: ProcessedMessages

  constructor (networkSlug: string) {
    if (process.env.WS_AUTH_KEY === '' || process.env.WS_AUTH_KEY === undefined) {
      throw new Error(RESPONSE_MESSAGES.MISSING_WS_AUTH_KEY_400.message)
    }

    this.networkSlug = networkSlug
    this.networkId = NETWORK_IDS_FROM_SLUGS[networkSlug]
    this.chronik = new ChronikClientNode([config.networkBlockchainURLs[networkSlug]])
    this.chronikWSEndpoint = this.chronik.ws(this.getWsConfig())
    this.confirmedTxsHashesFromLastBlock = []
    void this.chronikWSEndpoint.waitForOpen()
    this.chronikWSEndpoint.subscribeToBlocks()
    this.lastProcessedMessages = { confirmed: {}, unconfirmed: {} }
    this.CHRONIK_MSG_PREFIX = `[CHRONIK — ${networkSlug}]`
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

  public getSubscribedAddresses (): string[] {
    const ret = this.chronikWSEndpoint.subs.scripts.map((script: WsSubScriptClient) => fromHash160(this.networkSlug, script.scriptType, script.payload))
    return [...new Set(ret)]
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
    if (NETWORK_IDS_FROM_SLUGS[networkSlug] !== this.networkId) { throw new Error(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.message) }
  }

  async getBlockchainInfo (networkSlug: string): Promise<BlockchainInfo> {
    this.validateNetwork(networkSlug)
    const blockchainInfo = await this.chronik.blockchainInfo()
    return { height: blockchainInfo.tipHeight, hash: blockchainInfo.tipHash }
  }

  async getBlockInfo (networkSlug: string, height: number): Promise<BlockInfo> {
    this.validateNetwork(networkSlug)
    const blockInfo: BlockInfo_InNode = (await this.chronik.block(height)).blockInfo
    return { hash: blockInfo.hash, height: blockInfo.height, timestamp: blockInfo.timestamp }
  }

  private txThesholdFilter (address: Address) {
    return (t: Tx_InNode, _index: number, _array: Tx_InNode[]): boolean => {
      return (
        t.block === undefined ||
        (t.block?.timestamp >= XEC_TIMESTAMP_THRESHOLD && address.networkId === XEC_NETWORK_ID) ||
        (t.block?.timestamp >= BCH_TIMESTAMP_THRESHOLD && address.networkId === BCH_NETWORK_ID)
      )
    }
  }

  private async getTransactionAmountAndData (transaction: Tx_InNode, addressString: string): Promise<{amount: Prisma.Decimal, opReturn: string}> {
    let totalOutput = 0
    let totalInput = 0
    const addressFormat = xecaddr.detectAddressFormat(addressString)
    const script = toHash160(addressString).hash160
    let opReturn = ''

    for (const output of transaction.outputs) {
      if (output.outputScript.includes(script)) {
        totalOutput += output.value
      }
      if (opReturn === '') {
        const nullScriptData = getNullDataScriptData(output.outputScript)
        if (nullScriptData !== null) {
          opReturn = JSON.stringify(
            nullScriptData
          )
        }
      }
    }
    for (const input of transaction.inputs) {
      if (input?.outputScript?.includes(script) === true) {
        totalInput += input.value
      }
    }
    const satoshis = new Prisma.Decimal(totalOutput).minus(totalInput)
    return {
      amount: await satoshisToUnit(satoshis, addressFormat),
      opReturn
    }
  }

  private async getTransactionFromChronikTransaction (transaction: Tx_InNode, address: Address): Promise<Prisma.TransactionUncheckedCreateInput> {
    const { amount, opReturn } = await this.getTransactionAmountAndData(transaction, address.address)
    return {
      hash: transaction.txid,
      amount,
      timestamp: transaction.block !== undefined ? transaction.block.timestamp : transaction.timeFirstSeen,
      addressId: address.id,
      confirmed: transaction.block !== undefined,
      opReturn
    }
  }

  public async getPaginatedTxs (addressString: string, page: number, pageSize: number): Promise<Tx_InNode[]> {
    const { type, hash160 } = toHash160(addressString)
    return (await this.chronik.script(type, hash160).history(page, pageSize)).txs
  }

  public async * syncTransactionsForAddress (addressString: string, fully = false): AsyncGenerator<TransactionWithAddressAndPrices[]> {
    const address = await fetchAddressBySubstring(addressString)
    const pageSize = FETCH_N
    let page = 0
    const earliestUnconfirmedTxTimestamp = await getEarliestUnconfirmedTxTimestampForAddress(address.id)
    const latestTimestamp = earliestUnconfirmedTxTimestamp ?? await getLatestConfirmedTxTimestampForAddress(address.id) ?? 0

    if (address.syncing) { return }
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
      if (!fully && latestBlockTimestamp < latestTimestamp) break

      const confirmedTransactions = transactions.filter(t => t.block !== undefined)
      const unconfirmedTransactions = transactions.filter(t => t.block === undefined)

      page += 1

      const transactionsToPersist = await Promise.all(
        [...confirmedTransactions, ...unconfirmedTransactions].map(async tx => await this.getTransactionFromChronikTransaction(tx, address))
      )
      const persistedTransactions = await createManyTransactions(transactionsToPersist)
      const simplifiedTransactions = getSimplifiedTransactions(persistedTransactions)

      console.log(`${this.CHRONIK_MSG_PREFIX}: added ${simplifiedTransactions.length} txs to ${addressString}`)

      const broadcastTxData: BroadcastTxData = {} as BroadcastTxData
      broadcastTxData.messageType = 'OldTx'
      broadcastTxData.address = addressString
      broadcastTxData.txs = simplifiedTransactions

      this.wsEndpoint.emit(SOCKET_MESSAGES.TXS_BROADCAST, broadcastTxData)

      yield persistedTransactions

      await new Promise(resolve => setTimeout(resolve, FETCH_DELAY))
    }
    await setSyncing(addressString, false)
    await updateLastSynced(addressString)
  }

  private async getUtxos (address: string): Promise<ScriptUtxo_InNode[]> {
    const { type, hash160 } = toHash160(address)
    const scriptsUtxos = await this.chronik.script(type, hash160).utxos()
    return scriptsUtxos.utxos
  }

  public async getBalance (address: string): Promise<number> {
    const utxos = await this.getUtxos(address)
    return utxos.reduce((acc, utxo) => acc + utxo.value, 0)
  }

  async getTransactionDetails (hash: string): Promise<TransactionDetails> {
    const tx = await this.chronik.tx(hash)

    const details: TransactionDetails = {
      hash: tx.txid,
      version: tx.version,
      block: {
        hash: tx.block?.hash,
        height: tx.block?.height,
        timestamp: tx.block?.timestamp.toString()
      },
      inputs: [],
      outputs: []
    }
    for (const input of tx.inputs) {
      details.inputs.push({
        value: new Prisma.Decimal(input.value),
        address: outputScriptToAddress(this.networkSlug, input.outputScript)
      })
    }
    for (const output of tx.outputs) {
      details.outputs.push({
        value: new Prisma.Decimal(output.value),
        address: outputScriptToAddress(this.networkSlug, output.outputScript)
      })
    }
    return details
  }

  private getWsConfig (): WsConfig_InNode {
    return {
      onMessage: (msg: WsMsgClient) => { void this.processWsMessage(msg) },
      onError: (e: ws.ErrorEvent) => { console.log(`${this.CHRONIK_MSG_PREFIX}: Chronik webSocket error, type: ${e.type} | message: ${e.message} | error: ${e.error as string}`) },
      onReconnect: (_: ws.Event) => { console.log(`${this.CHRONIK_MSG_PREFIX}: Chronik webSocket unexpectedly closed.`) },
      onConnect: (_: ws.Event) => { console.log(`${this.CHRONIK_MSG_PREFIX}: Chronik webSocket connection (re)established.`) },
      onEnd: (e: ws.Event) => { console.log(`${this.CHRONIK_MSG_PREFIX}: Chronik WebSocket ended, type: ${e.type}.`) },
      autoReconnect: true
    }
  }

  private async processWsMessage (msg: WsMsgClient): Promise<void> {
    // delete unconfirmed transaction from our database
    // if they were cancelled and not confirmed
    if (msg.type === 'Tx') {
      if (msg.msgType === 'TX_REMOVED_FROM_MEMPOOL') {
        console.log(`${this.CHRONIK_MSG_PREFIX}: [${msg.msgType}] ${msg.txid}`)
        const transactionsToDelete = await fetchUnconfirmedTransactions(msg.txid)
        try {
          await deleteTransactions(transactionsToDelete)
        } catch (err: any) {
          const parsedError = parseError(err)
          if (parsedError.message !== RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404.message) {
            throw err
          }
        }
      } else if (msg.msgType === 'TX_CONFIRMED') {
        console.log(`${this.CHRONIK_MSG_PREFIX}: [${msg.msgType}] ${msg.txid}`)
        this.confirmedTxsHashesFromLastBlock = [...this.confirmedTxsHashesFromLastBlock, msg.txid]
      } else if (msg.msgType === 'TX_ADDED_TO_MEMPOOL') {
        if (this.isAlreadyBeingProcessed(msg.txid, false)) {
          return
        }
        console.log(`${this.CHRONIK_MSG_PREFIX}: [${msg.msgType}] ${msg.txid}`)
        const transaction = await this.chronik.tx(msg.txid)
        const addressesWithTransactions = await this.getAddressesForTransaction(transaction)
        for (const addressWithTransaction of addressesWithTransactions) {
          const { created, tx } = await createTransaction(addressWithTransaction.transaction)
          if (tx !== undefined) {
            const broadcastTxData = this.broadcastIncomingTx(addressWithTransaction.address.address, tx)
            if (created) { // only execute trigger for newly added txs
              await executeAddressTriggers(broadcastTxData, tx.address.networkId)
            }
          }
        }
      }
    } else if (msg.type === 'Block') {
      console.log(`${this.CHRONIK_MSG_PREFIX}: [${msg.msgType}] ${msg.msgType} Height: ${msg.blockHeight} Hash: ${msg.blockHash}`)
      if (msg.msgType === 'BLK_FINALIZED') {
        await this.syncBlockTransactions(msg.blockHash)
        this.confirmedTxsHashesFromLastBlock = []
      }
    } else if (msg.type === 'Error') {
      console.log(`${this.CHRONIK_MSG_PREFIX}: [${msg.type}] ${JSON.stringify(msg.msg)}`)
    }
  }

  private broadcastIncomingTx (addressString: string, createdTx: TransactionWithAddressAndPrices): BroadcastTxData {
    const broadcastTxData: BroadcastTxData = {} as BroadcastTxData
    broadcastTxData.address = addressString
    broadcastTxData.messageType = 'NewTx'
    const newSimplifiedTransaction = getSimplifiedTrasaction(createdTx)
    broadcastTxData.txs = [newSimplifiedTransaction]
    try { // emit broadcast for both unconfirmed and confirmed txs
      this.wsEndpoint.emit(SOCKET_MESSAGES.TXS_BROADCAST, broadcastTxData)
    } catch (err: any) {
      console.error(RESPONSE_MESSAGES.COULD_NOT_BROADCAST_TX_TO_WS_SERVER_500.message, err.stack)
    }
    return broadcastTxData
  }

  private async syncBlockTransactions (blockHash: string): Promise<void> {
    console.log('syncing block txs, expects', this.confirmedTxsHashesFromLastBlock.length, 'txs to be synced')
    let page = 0
    const pageSize = 200
    let blockTxsPage = (await this.chronik.blockTxs(blockHash, page, pageSize)).txs
    let blockTxsToSync: Tx_InNode[] = []
    while (blockTxsPage.length > 0 && blockTxsToSync.length !== this.confirmedTxsHashesFromLastBlock.length) {
      const thisBlockTxsToSync = blockTxsPage.filter(tx => this.confirmedTxsHashesFromLastBlock.includes(tx.txid))
      blockTxsToSync = [...blockTxsToSync, ...thisBlockTxsToSync]
      page += 1
      blockTxsPage = (await this.chronik.blockTxs(blockHash, page, pageSize)).txs
    }
    for (const transaction of blockTxsToSync) {
      const addressesWithTransactions = await this.getAddressesForTransaction(transaction)
      for (const addressWithTransaction of addressesWithTransactions) {
        const { created, tx } = await createTransaction(addressWithTransaction.transaction)
        if (tx !== undefined) {
          const broadcastTxData = this.broadcastIncomingTx(addressWithTransaction.address.address, tx)
          if (created) { // only execute trigger for newly added txs
            await executeAddressTriggers(broadcastTxData, tx.address.networkId)
          }
        }
      }
    }
  }

  private getRelatedAddressesForTransaction (transaction: Tx_InNode): string[] {
    const inputAddresses = transaction.inputs.map(inp => outputScriptToAddress(this.networkSlug, inp.outputScript))
    const outputAddresses = transaction.outputs.map(out => outputScriptToAddress(this.networkSlug, out.outputScript))
    return [...inputAddresses, ...outputAddresses].filter(a => a !== undefined)
  }

  private async getAddressesForTransaction (transaction: Tx_InNode): Promise<AddressWithTransaction[]> {
    const relatedAddresses = this.getRelatedAddressesForTransaction(transaction)
    const addressesFromStringArray = await fetchAddressesArray(relatedAddresses)
    const addressesWithTransactions: AddressWithTransaction[] = await Promise.all(addressesFromStringArray.map(
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
    const subscribedAddresses = this.getSubscribedAddresses()
    addresses = addresses
      .filter(addr => (
        addr.networkId === this.networkId &&
      !subscribedAddresses.includes(addr.address))
      )
    if (addresses.length === 0) return

    addresses.forEach(address => {
      console.log(`${this.CHRONIK_MSG_PREFIX}: subscribing `, address.address)
      this.chronikWSEndpoint.subscribeToAddress(address.address)
    })
  }

  public async syncAddresses (addresses: Address[]): Promise<SyncAndSubscriptionReturn> {
    const failedAddressesWithErrors: KeyValueT<string> = {}
    const successfulAddressesWithCount: KeyValueT<number> = {}
    let txsToSave: Prisma.TransactionCreateManyInput[] = []

    const productionAddressesIds = productionAddresses.filter(addr => addr.networkId === this.networkId).map(addr => addr.id)
    addresses = addresses.filter(addr => addr.networkId === this.networkId)
    if (addresses.length === 0) {
      return {
        failedAddressesWithErrors,
        successfulAddressesWithCount
      }
    }
    console.log(`${this.CHRONIK_MSG_PREFIX} Syncing ${addresses.length} addresses...`)
    for (const addr of addresses) {
      try {
        const generator = this.syncTransactionsForAddress(addr.address)
        let count = 0
        while (true) {
          const result = await generator.next()
          if (result.done === true) break
          if (productionAddressesIds.includes(addr.id)) {
            const txs = result.value
            count += txs.length
            txsToSave = txsToSave.concat(txs)
            if (txsToSave.length !== 0) {
              await appendTxsToFile(txsToSave)
            }
          }
        }
        successfulAddressesWithCount[addr.address] = count
      } catch (err: any) {
        failedAddressesWithErrors[addr.address] = err.stack
      } finally {
        await setSyncing(addr.address, false)
      }
    }
    const failedAddresses = Object.keys(failedAddressesWithErrors)
    console.log(`${this.CHRONIK_MSG_PREFIX} Finished syncing ${addresses.length} addresses with ${failedAddresses.length} errors.`)
    if (failedAddresses.length > 0) {
      console.log(`${this.CHRONIK_MSG_PREFIX} Failed addresses were:\n- ${failedAddresses.join('\n- ')}`)
    }
    return {
      failedAddressesWithErrors,
      successfulAddressesWithCount
    }
  }

  public async syncMissedTransactions (): Promise<void> {
    const addresses = await fetchAllAddressesForNetworkId(this.networkId)
    try {
      const { failedAddressesWithErrors, successfulAddressesWithCount } = await this.syncAddresses(addresses)
      Object.keys(failedAddressesWithErrors).forEach((addr) => {
        console.error(`${this.CHRONIK_MSG_PREFIX}: When syncing missing addresses for address ${addr} encountered error: ${failedAddressesWithErrors[addr]}`)
      })
      Object.keys(successfulAddressesWithCount).forEach((addr) => {
        if (successfulAddressesWithCount[addr] > 0) {
          console.log(`${this.CHRONIK_MSG_PREFIX}: Successful synced ${successfulAddressesWithCount[addr]} missed txs for ${addr}.`)
        }
      })
    } catch (err: any) {
      console.error(`${this.CHRONIK_MSG_PREFIX}: ERROR: (skipping anyway) initial missing transactions sync failed: ${err.message as string} ${err.stack as string}`)
    }
  }

  public async subscribeInitialAddresses (): Promise<void> {
    const addresses = await fetchAllAddressesForNetworkId(this.networkId)
    try {
      await this.subscribeAddresses(addresses)
    } catch (err: any) {
      console.error(`${this.CHRONIK_MSG_PREFIX}: ERROR: (skipping anyway) initial chronik subscription failed: ${err.message as string} ${err.stack as string}`)
    }
  }

  public async getLastBlockTimestamp (): Promise<number> {
    const blockchainInfo = await this.getBlockchainInfo(this.networkSlug)
    const lastBlockInfo = await this.getBlockInfo(this.networkSlug, blockchainInfo.height)
    return lastBlockInfo.timestamp
  }
}

export function fromHash160 (networkSlug: string, type: string, hash160: string): string {
  const buffer = Buffer.from(hash160, 'hex')

  // Because ecashaddrjs only accepts Uint8Array as input type, convert
  const hash160ArrayBuffer = new ArrayBuffer(buffer.length)
  const hash160Uint8Array = new Uint8Array(hash160ArrayBuffer)
  for (let i = 0; i < hash160Uint8Array.length; i += 1) {
    hash160Uint8Array[i] = buffer[i]
  }

  return encode(
    networkSlug,
    type.toUpperCase(),
    hash160Uint8Array
  )
}

export function toHash160 (address: string): {type: ScriptType_InNode, hash160: string} {
  try {
    const { type, hash } = decode(address)
    const legacyAdress = bs58.encode(hash)
    const addrHash160 = Buffer.from(bs58.decode(legacyAdress)).toString(
      'hex'
    )
    return { type: type.toLowerCase() as ScriptType_InNode, hash160: addrHash160 }
  } catch (err) {
    console.log('[CHRONIK]: Error converting address to hash160')
    throw err
  }
}

// returns P2SH (type 76a914...88ac) or P2PKH (type a914...87) address
export function outputScriptToAddress (networkSlug: string, outputScript: string | undefined): string | undefined {
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

  return fromHash160(networkSlug, addressType, hash160)
}

class MultiBlockchainClient {
  private clients!: Record<MainNetworkSlugsType, ChronikBlockchainClient>

  constructor () {
    console.log('Initializing MultiBlockchainClient...')
    void (async () => {
      await syncPastDaysNewerPrices()
      const asyncOperations: Array<Promise<void>> = []
      this.clients = {
        ecash: this.instantiateChronikClient('ecash', asyncOperations),
        bitcoincash: this.instantiateChronikClient('bitcoincash', asyncOperations)
      }
      await Promise.all(asyncOperations)
      await connectAllTransactionsToPrices()
    })()
  }

  private instantiateChronikClient (networkSlug: string, asyncOperations: Array<Promise<void>>): ChronikBlockchainClient {
    console.log(`[CHRONIK — ${networkSlug}] Instantiating client...`)
    const newClient = new ChronikBlockchainClient(networkSlug)

    // Subscribe addresses & Sync lost transactions on DB upon client initialization
    if (
      process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD &&
      process.env.NODE_ENV !== 'test' &&
      process.env.JOBS_ENV === undefined
    ) {
      console.log(`[CHRONIK — ${networkSlug}] Subscribing addresses in database...`)
      asyncOperations.push(newClient.subscribeInitialAddresses())
      console.log(`[CHRONIK — ${networkSlug}] Syncing missed transactions...`)
      asyncOperations.push(newClient.syncMissedTransactions())
    }

    return newClient
  }

  public getAllSubscribedAddresses (): SubbedAddressesLog {
    const ret = {} as any
    for (const key of Object.keys(this.clients)) {
      ret[key] = this.clients[key as MainNetworkSlugsType]?.getSubscribedAddresses()
    }
    return ret
  }

  public async subscribeAddresses (addresses: Address[]): Promise<void> {
    await Promise.all(
      Object.keys(this.clients).map(async (networkSlug) => {
        const addressesOfNetwork = addresses.filter(
          (address) => address.networkId === NETWORK_IDS[NETWORK_TICKERS[networkSlug]]
        )
        const client = this.clients[networkSlug as MainNetworkSlugsType]
        await client.subscribeAddresses(addressesOfNetwork)
      })
    )
  }

  public async syncAddresses (addresses: Address[]): Promise<SyncAndSubscriptionReturn> {
    let failedAddressesWithErrors: KeyValueT<string> = {}
    let successfulAddressesWithCount: KeyValueT<number> = {}

    for (const networkSlug of Object.keys(this.clients)) {
      const ret = await this.clients[networkSlug as MainNetworkSlugsType].syncAddresses(addresses)
      failedAddressesWithErrors = { ...failedAddressesWithErrors, ...ret.failedAddressesWithErrors }
      successfulAddressesWithCount = { ...successfulAddressesWithCount, ...ret.successfulAddressesWithCount }
    }
    return {
      failedAddressesWithErrors,
      successfulAddressesWithCount
    }
  }

  public async getTransactionDetails (hash: string, networkSlug: string): Promise<TransactionDetails> {
    return await this.clients[networkSlug as MainNetworkSlugsType].getTransactionDetails(hash)
  }

  public async getLastBlockTimestamp (networkSlug: string): Promise<number> {
    return await this.clients[networkSlug as MainNetworkSlugsType].getLastBlockTimestamp()
  }

  public async getBalance (address: string): Promise<number> {
    const networkSlug = getAddressPrefix(address)
    return await this.clients[networkSlug as MainNetworkSlugsType].getBalance(address)
  }

  public async syncAndSubscribeAddresses (addresses: Address[]): Promise<SyncAndSubscriptionReturn> {
    await this.subscribeAddresses(addresses)
    return await this.syncAddresses(addresses)
  }
}

/* WIPTHIS THIS IS PROBABLY USELESS DELETE
  public async syncAndSubscribeAddresses (addresses: Address[]): Promise<SyncAndSubscriptionReturn> {
    const failedAddressesWithErrors: KeyValueT<string> = {}
    const successfulAddressesWithCount: KeyValueT<number> = {}
    let txsToSave: Prisma.TransactionCreateManyInput[] = []

    const productionAddressesIds = productionAddresses.map(addr => addr.id)
    await Promise.all(
      addresses.map(async (addr) => {
        try {
          await this.subscribeAddresses([addr])
          const prefix = getAddressPrefix(addr.address)
          const generator = BLOCKCHAIN_CLIENTS[prefix].syncTransactionsForAddress(addr.address)
          let count = 0
          while (true) {
            const result = await generator.next()
            if (result.done === true) break
            if (productionAddressesIds.includes(addr.id)) {
              const txs = result.value
              count += txs.length
              txsToSave = txsToSave.concat(txs)
              if (txsToSave.length !== 0) {
                await appendTxsToFile(txsToSave)
              }
            }
          }
          successfulAddressesWithCount[addr.address] = count
        } catch (err: any) {
          failedAddressesWithErrors[addr.address] = err.stack
        }
      })
    )
    if (txsToSave.length !== 0) {
      await appendTxsToFile(txsToSave)
    }
    return {
      failedAddressesWithErrors,
      successfulAddressesWithCount
    }
  }
*/

export interface NodeJsGlobalMultiBlockchainClient extends NodeJS.Global {
  multiBlockchainClient?: MultiBlockchainClient
}
declare const global: NodeJsGlobalMultiBlockchainClient

if (global.multiBlockchainClient === undefined) {
  global.multiBlockchainClient = new MultiBlockchainClient()
}

export const multiBlockchainClient: MultiBlockchainClient = global.multiBlockchainClient
