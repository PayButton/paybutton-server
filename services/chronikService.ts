import { BlockInfo, ChronikClient, ConnectionStrategy, ScriptUtxo, Tx, WsConfig, WsEndpoint, WsMsgClient, WsSubScriptClient } from 'chronik-client'
import { encodeCashAddress, decodeCashAddress } from 'ecashaddrjs'
import { AddressWithTransaction, BlockchainInfo, TransactionDetails, ProcessedMessages, SubbedAddressesLog, SyncAndSubscriptionReturn, SubscriptionReturn, SimpleBlockInfo } from 'types/chronikTypes'
import { CHRONIK_MESSAGE_CACHE_DELAY, RESPONSE_MESSAGES, XEC_TIMESTAMP_THRESHOLD, XEC_NETWORK_ID, BCH_NETWORK_ID, BCH_TIMESTAMP_THRESHOLD, CHRONIK_FETCH_N_TXS_PER_PAGE, KeyValueT, NETWORK_IDS_FROM_SLUGS, SOCKET_MESSAGES, NETWORK_IDS, NETWORK_TICKERS, MainNetworkSlugsType, MAX_MEMPOOL_TXS_TO_PROCESS_AT_A_TIME, MAX_CONFIRMED_TXS_TO_PROCESS_AT_A_TIME, MEMPOOL_PROCESS_DELAY, CONFIRMED_TX_PROCESS_DELAY, CHRONIK_INITIALIZATION_DELAY, LATENCY_TEST_CHECK_DELAY, INITIAL_ADDRESS_SYNC_FETCH_CONCURRENTLY, TX_EMIT_BATCH_SIZE, DB_COMMIT_BATCH_SIZE, MAX_TXS_PER_ADDRESS, TX_BATCH_POLLING_DELAY, SLOW_ADDRESS_SYNC_LOG_THRESHOLD, SLOWEST_ADDRESSES_TO_LOG, CHRONIK_HTTP_MAX_TRIES, CHRONIK_HTTP_BASE_DELAY_MS, CHRONIK_WS_BASE_DELAY_MS, CHRONIK_WS_MAX_DELAY_MS, ADDRESS_EXPIRY_SWEEP_INTERVAL, ADDRESS_EXPIRY_SWEEP_INITIAL_DELAY, ADDRESS_EXPIRY_SWEEP_BATCH_SIZE } from 'constants/index'
import { productionAddresses } from 'prisma-local/seeds/addresses'
import prisma from 'prisma-local/clientInstance'
import {
  TransactionWithAddressAndPrices,
  createManyTransactions,
  createManyTransactionsForSync,
  filterRowsNeedingCreateMany,
  SyncPersistedTransaction,
  deleteTransactions,
  fetchUnconfirmedTransactions,
  markTransactionsOrphaned,
  upsertTransaction,
  getSimplifiedTransactions,
  getSimplifiedTrasaction,
  connectTransactionsToPricesForAddresses,
  connectTransactionsListToPrices,
  invalidateCachesForAddresses
} from './transactionService'
import { CacheSet } from 'redis/index'
import {
  updateClientPaymentStatus,
  getClientPayment
} from './clientPaymentService'
import { Address, Prisma, ClientPaymentStatus } from '@prisma/client'
import xecaddr from 'xecaddrjs'
import { getAddressPrefix, satoshisToUnit } from 'utils/index'
import { fetchAddressesArray, fetchActiveAddressesForNetworkId, fetchExpiredAddressesForNetworkId, isAddressExpired, touchAddressActivity, fetchAddressesByIdList, fetchExpiredUserAddresses, touchUserAddressesActivity, getEarliestUnconfirmedTxTimestampForAddress, getLatestConfirmedTxTimestampForAddress, setSyncing, setSyncingBatch, updateLastSynced } from './addressService'
import * as ws from 'ws'
import { BroadcastTxData } from 'ws-service/types'
import config from 'config'
import { SyncProgressTracker } from 'redis/syncProgress'
import io, { Socket } from 'socket.io-client'
import moment from 'moment'
import { OpReturnData, parseError, parseOpReturnData } from 'utils/validators'
import { executeAddressTriggers, executeTriggersBatch } from './triggerService'
import { appendTxsToFile } from 'prisma-local/seeds/transactions'
import { PHASE_PRODUCTION_BUILD } from 'next/dist/shared/lib/constants'
import { AddressType } from 'ecashaddrjs/dist/types'
import { DecimalJsLike } from '@prisma/client/runtime/library'

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

interface ChronikTxWithAddress { tx: Tx, address: Address }

type FetchBatchPhase = 'tx-drain' | 'drain-complete' | 'addresses-synced'

interface FetchedTxsBatch {
  phase: FetchBatchPhase
  chronikTxs: ChronikTxWithAddress[]
  addressesSynced: string[]
}

export class ChronikBlockchainClient {
  chronik!: ChronikClient
  networkId!: number
  networkSlug!: string
  chronikWSEndpoint!: WsEndpoint
  confirmedTxsHashesFromLastBlock!: string[]
  wsEndpoint!: Socket
  CHRONIK_MSG_PREFIX!: string
  lastProcessedMessages!: ProcessedMessages
  initializing!: boolean
  mempoolTxsBeingProcessed!: number
  // Set by MultiBlockchainClient. Called when a live tx lands on an address
  // that isn't subscribed (an expired one), to subscribe it and sync its gap.
  onUnsubscribedAddressTx?: (addresses: Address[]) => Promise<void>

  private latencyTestFinished: boolean
  // Bumped every time a new chronik WS endpoint is created, so callbacks and
  // retry loops belonging to a replaced endpoint can tell they are stale.
  private wsGeneration = 0
  private wsClosedOnPurpose = false
  // Whether a WS connection has been opened before, so later ones are reconnects.
  private wsHasConnected = false
  // Post-reconnect backfill in progress, and whether another reconnect asked for one meanwhile.
  private wsBackfillRun: Promise<void> | undefined
  private wsBackfillPending = false
  private confirmedTxsBeingProcessed = 0

  constructor (networkSlug: string) {
    this.latencyTestFinished = false
    void (async () => {
      if (process.env.WS_AUTH_KEY === '' || process.env.WS_AUTH_KEY === undefined) {
        throw new Error(RESPONSE_MESSAGES.MISSING_WS_AUTH_KEY_400.message)
      }

      this.initializing = true
      this.mempoolTxsBeingProcessed = 0
      this.networkSlug = networkSlug
      this.networkId = NETWORK_IDS_FROM_SLUGS[networkSlug]
      this.chronik = await ChronikClient.useStrategy(
        ConnectionStrategy.ClosestFirst,
        config.networkBlockchainURLs[networkSlug]
      )
      this.latencyTestFinished = true
      this.CHRONIK_MSG_PREFIX = `[CHRONIK — ${networkSlug}]`
      this.confirmedTxsHashesFromLastBlock = []
      this.openWs()
      this.lastProcessedMessages = { confirmed: {}, unconfirmed: {} }
      this.wsEndpoint = io(`${config.wsBaseURL}/broadcast`, {
        query: {
          key: process.env.WS_AUTH_KEY
        }
      })
    })()
  }

  private getLastSyncTs (addr: Address): number {
    return (addr.lastSynced != null) ? Math.floor(new Date(addr.lastSynced).getTime() / 1000) : 0
  }

  public async waitForLatencyTest (): Promise<void> {
    while (true) {
      if (this.latencyTestFinished) {
        return
      }
      await new Promise(resolve => setTimeout(resolve, LATENCY_TEST_CHECK_DELAY))
    }
  }

  private isCurrentWs (generation: number): boolean {
    return !this.wsClosedOnPurpose && generation === this.wsGeneration
  }

  // Creates a fresh chronik WS endpoint (carrying over the given address
  // subscriptions) and keeps trying to connect it until it opens or is replaced.
  private openWs (addresses: string[] = []): void {
    const generation = ++this.wsGeneration
    const endpoint = this.chronik.ws(this.getWsConfig(generation))
    endpoint.subscribeToBlocks()
    for (const addr of addresses) {
      endpoint.subscribeToAddress(addr)
    }
    this.chronikWSEndpoint = endpoint
    void this.connectWsWithRetry(endpoint, generation)
  }

  private async connectWsWithRetry (endpoint: WsEndpoint, generation: number, baseDelay = CHRONIK_WS_BASE_DELAY_MS): Promise<void> {
    // Never give up: without this socket no new payments are detected and no triggers run.
    for (let attempt = 1; this.isCurrentWs(generation); attempt++) {
      try {
        await endpoint.waitForOpen()
        if (!this.isCurrentWs(generation)) return
        console.log(`${this.CHRONIK_MSG_PREFIX}: WebSocket connected.`)
        if (this.wsHasConnected) {
          void this.backfillAfterReconnect()
        }
        this.wsHasConnected = true
        return
      } catch (err: any) {
        const delay = Math.min(baseDelay * Math.pow(2, Math.min(attempt - 1, 16)), CHRONIK_WS_MAX_DELAY_MS)
        console.error(`${this.CHRONIK_MSG_PREFIX}: WebSocket connection attempt ${attempt} failed: ${err.message as string}. Retrying in ${delay / 1000}s...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // Txs that hit the mempool or a block while the WS was down never produce a WS
  // message, so their payments, triggers and client payment statuses would be
  // missed until the next restart. After each reconnect, sync the subscribed
  // addresses to catch them.
  // Runs one at a time; reconnects during a run schedule a single follow-up run.
  public async backfillAfterReconnect (): Promise<void> {
    if (this.wsBackfillRun !== undefined) {
      this.wsBackfillPending = true
      return
    }
    this.wsBackfillRun = (async () => {
      do {
        this.wsBackfillPending = false
        const subscribed = this.getSubscribedAddresses()
        if (subscribed.length === 0) continue
        try {
          const addresses = await fetchAddressesArray(subscribed)
          console.log(`${this.CHRONIK_MSG_PREFIX}: Syncing ${addresses.length} subscribed addresses for txs missed while the WebSocket was down...`)
          const { failedAddressesWithErrors, successfulAddressesWithCount } = await this.syncAddresses(addresses, true, true)
          const missed = Object.values(successfulAddressesWithCount).reduce((p, c) => p + c, 0)
          const failed = Object.keys(failedAddressesWithErrors).length
          console.log(`${this.CHRONIK_MSG_PREFIX}: Post-reconnect sync found ${missed} missed txs (${failed} addresses failed).`)
        } catch (err: any) {
          console.error(`${this.CHRONIK_MSG_PREFIX}: Post-reconnect sync failed: ${err.message as string}`)
        }
      } while (this.wsBackfillPending)
    })()
    try {
      await this.wsBackfillRun
    } finally {
      this.wsBackfillRun = undefined
    }
  }

  private async handleWsEnded (generation: number): Promise<void> {
    if (!this.isCurrentWs(generation)) return
    console.log(`${this.CHRONIK_MSG_PREFIX}: Reconnecting chronik WebSocket in ${CHRONIK_WS_BASE_DELAY_MS / 1000}s...`)
    await new Promise(resolve => setTimeout(resolve, CHRONIK_WS_BASE_DELAY_MS))
    if (!this.isCurrentWs(generation)) return
    this.openWs(this.getSubscribedAddresses())
  }

  public closeWs (): void {
    this.wsClosedOnPurpose = true
    this.chronikWSEndpoint?.close()
  }

  public getUrls (): string[] {
    return this.chronik.proxyInterface().getEndpointArray().map(e => e.url)
  }

  public setInitialized (): void {
    this.initializing = false
  }

  private clearOldMessages (): void {
    const now = moment().unix()

    for (const key of Object.keys(this.lastProcessedMessages.unconfirmed)) {
      const ageDiffMs = (now - Number(this.lastProcessedMessages.unconfirmed[key])) * 1000
      if (ageDiffMs > CHRONIK_MESSAGE_CACHE_DELAY) {
        const { [key]: _, ...rest } = this.lastProcessedMessages.unconfirmed
        this.lastProcessedMessages.unconfirmed = rest
      }
    }

    for (const key of Object.keys(this.lastProcessedMessages.confirmed)) {
      const ageDiffMs = (now - Number(this.lastProcessedMessages.confirmed[key])) * 1000
      if (ageDiffMs > CHRONIK_MESSAGE_CACHE_DELAY) {
        const { [key]: _, ...rest } = this.lastProcessedMessages.confirmed
        this.lastProcessedMessages.confirmed = rest
      }
    }
  }

  public getSubscribedAddresses (): string[] {
    const ret = this.chronikWSEndpoint.subs.scripts.map((script: WsSubScriptClient) => fromHash160(this.networkSlug, script.scriptType as AddressType, script.payload))
    return [...new Set(ret)]
  }

  public unsubscribeAddresses (addresses: string[]): void {
    const subscribed = new Set(this.getSubscribedAddresses())
    for (const address of addresses) {
      if (!subscribed.has(address)) continue
      try {
        this.chronikWSEndpoint.unsubscribeFromAddress(address)
      } catch (err: any) {
        console.error(`${this.CHRONIK_MSG_PREFIX}: Failed to unsubscribe ${address}: ${err.message as string}`)
      }
    }
  }

  // The live handlers store txs for every known address involved, including
  // expired ones that aren't subscribed. Such a tx is activity: hand those
  // addresses over to be subscribed and caught up, without blocking the handler.
  private reviveUnsubscribedAddresses (addresses: Address[]): void {
    if (this.onUnsubscribedAddressTx === undefined || addresses.length === 0) return
    const subscribed = new Set(this.getSubscribedAddresses())
    const unsubscribed = addresses.filter(a => !subscribed.has(a.address))
    if (unsubscribed.length === 0) return
    void this.onUnsubscribedAddressTx(unsubscribed).catch((err: any) => {
      console.error(`${this.CHRONIK_MSG_PREFIX}: Failed to revive ${unsubscribed.length} addresses after a live tx: ${err.message as string}`)
    })
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

  private async chronikCallWithRetry<T> (
    label: string,
    fn: () => Promise<T>,
    tries = CHRONIK_HTTP_MAX_TRIES,
    delayMs = CHRONIK_HTTP_BASE_DELAY_MS
  ): Promise<T> {
    for (let i = 0; i < tries - 1; i++) {
      try {
        return await fn()
      } catch (e: unknown) {
        const delay = delayMs * Math.pow(2, i)
        const errMsg = e instanceof Error ? e.message : String(e)
        console.warn(
          `${this.CHRONIK_MSG_PREFIX}: ${label} failed (${errMsg}), ` +
          `attempt ${i + 1}/${tries}, retrying in ${(delay / 1000).toFixed(1)}s...`
        )
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return await fn()
  }

  async getBlockchainInfo (networkSlug: string): Promise<BlockchainInfo> {
    this.validateNetwork(networkSlug)
    const blockchainInfo = await this.chronikCallWithRetry(
      'blockchainInfo',
      async () => await this.chronik.blockchainInfo()
    )
    return { height: blockchainInfo.tipHeight, hash: blockchainInfo.tipHash }
  }

  async getBlockInfo (networkSlug: string, height: number): Promise<SimpleBlockInfo> {
    this.validateNetwork(networkSlug)
    const blockInfo: BlockInfo = (await this.chronikCallWithRetry(
      `block ${height}`,
      async () => await this.chronik.block(height)
    )).blockInfo
    return { hash: blockInfo.hash, height: blockInfo.height, timestamp: blockInfo.timestamp }
  }

  private txThesholdFilter (address: Address) {
    return (t: Tx, _index: number, _array: Tx[]): boolean => {
      return (
        t.block === undefined ||
        (t.block?.timestamp >= XEC_TIMESTAMP_THRESHOLD && address.networkId === XEC_NETWORK_ID) ||
        (t.block?.timestamp >= BCH_TIMESTAMP_THRESHOLD && address.networkId === BCH_NETWORK_ID)
      )
    }
  }

  private getTransactionAmountAndData (transaction: Tx, addressString: string): {amount: Prisma.Decimal, opReturn: string} {
    let totalOutput = 0n
    let totalInput = 0n
    const addressFormat = xecaddr.detectAddressFormat(addressString)
    const script = toHash160(addressString).hash160
    let opReturn = ''

    for (const output of transaction.outputs) {
      if (output.outputScript.includes(script)) {
        totalOutput += output.sats
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
        totalInput += input.sats
      }
    }

    const satoshis = totalOutput - totalInput
    const amount = satoshisToUnit(satoshis, addressFormat)

    return {
      amount,
      opReturn
    }
  }

  private getTransactionFromChronikTransaction (transaction: Tx, address: Address): Prisma.TransactionUncheckedCreateInput {
    const { amount, opReturn } = this.getTransactionAmountAndData(transaction, address.address)
    const inputAddresses = this.getSortedInputAddresses(transaction)

    return {
      hash: transaction.txid,
      amount,
      timestamp: transaction.block !== undefined ? transaction.block.timestamp : transaction.timeFirstSeen,
      addressId: address.id,
      confirmed: transaction.block !== undefined,
      isPayment: amount > 0,
      opReturn,
      inputs: {
        create: inputAddresses
      }
    }
  }

  public async getPaginatedTxs (addressString: string, page: number, pageSize: number): Promise<Tx[]> {
    const { type, hash160 } = toHash160(addressString)
    const txsPage = await this.chronikCallWithRetry(
      `script history ${addressString} page ${page}`,
      async () => await this.chronik.script(type, hash160).history(page, pageSize)
    )

    // If there are too many txs, this might be too expensive to sync. Raise an
    // error to skip this address.
    if (txsPage.numTxs > MAX_TXS_PER_ADDRESS) {
      throw new Error(`Address ${addressString} has too many txs to sync (${txsPage.numTxs} > ${MAX_TXS_PER_ADDRESS}).`)
    }

    return txsPage.txs
  }

  private logSyncTimings (
    logPrefix: string,
    startedAt: number,
    timings: Array<{ address: string, ms: number, chronikMs: number, pages: number, newTxs: number }>
  ): void {
    const totalPages = timings.reduce((sum, t) => sum + t.pages, 0)
    const totalChronikMs = timings.reduce((sum, t) => sum + t.chronikMs, 0)
    const withNewTxs = timings.filter(t => t.newTxs > 0).length
    console.log(
      `${logPrefix} <<< Fetched ${timings.length} addresses in ${((Date.now() - startedAt) / 1000).toFixed(1)}s: ` +
      `${withNewTxs} with new txs, ${totalPages} chronik pages, ${(totalChronikMs / 1000).toFixed(1)}s total chronik time.`
    )
    const slowest = [...timings].sort((a, b) => b.ms - a.ms).slice(0, SLOWEST_ADDRESSES_TO_LOG)
    for (const t of slowest) {
      console.log(
        `${logPrefix} slowest: ${t.address} ${(t.ms / 1000).toFixed(1)}s, ${t.pages} pages, ${t.newTxs} new txs ` +
        `(chronik ${(t.chronikMs / 1000).toFixed(1)}s).`
      )
    }
  }

  /*
   * For each address, fetch pages in parallel (“burst”),
   * then use the burst’s newest/oldest timestamps to decide whether to continue.
   * Yields happen only in the generator body (after each slice finishes, and at final flush).
  */
  private async * fetchLatestTxsForAddresses (
    addresses: Address[]
  ): AsyncGenerator<FetchedTxsBatch> {
    const logPrefix = `${this.CHRONIK_MSG_PREFIX}[PARALLEL FETCHING]`

    const totalCount = addresses.length
    console.log(
      `${logPrefix} >>> Will fetch latest txs for ${totalCount} addresses ` +
      `(addressConcurrency=${INITIAL_ADDRESS_SYNC_FETCH_CONCURRENTLY}, pageConcurrency=1).`
    )

    const chronikTxs: ChronikTxWithAddress[] = []
    const completedAddresses: string[] = []
    // Per-address timings, to find what makes a startup sync slow. "waited" is
    // time not spent fetching from chronik: mostly paused while batches are
    // committed to the DB.
    const fetchStartedAt = Date.now()
    const addressTimings: Array<{ address: string, ms: number, chronikMs: number, pages: number, newTxs: number }> = []

    let producersPaused = false
    const producerPauseWaiters: Array<() => void> = []

    const waitWhilePaused = async (): Promise<void> => {
      // producersPaused is cleared by resumeProducers during drain cycles
      // eslint-disable-next-line no-unmodified-loop-condition
      while (producersPaused) {
        await new Promise<void>(resolve => {
          producerPauseWaiters.push(resolve)
        })
      }
    }

    const resumeProducers = (): void => {
      producersPaused = false
      const waiters = producerPauseWaiters.splice(0)
      for (const resolve of waiters) {
        resolve()
      }
    }

    async function * runDrainCycle (): AsyncGenerator<FetchedTxsBatch> {
      producersPaused = true

      while (chronikTxs.length >= TX_EMIT_BATCH_SIZE) {
        const chronikTxsSlice = chronikTxs.splice(0, TX_EMIT_BATCH_SIZE)
        yield {
          phase: 'tx-drain',
          chronikTxs: chronikTxsSlice,
          addressesSynced: []
        }
      }

      if (chronikTxs.length > 0) {
        const remaining = chronikTxs.splice(0)
        yield {
          phase: 'tx-drain',
          chronikTxs: remaining,
          addressesSynced: []
        }
      }

      yield {
        phase: 'drain-complete',
        chronikTxs: [],
        addressesSynced: []
      }

      // Consumer processes drain-complete before this runs (for await next())
      producersPaused = false
      resumeProducers()
    }

    // Worker pool: maintain exactly INITIAL_ADDRESS_SYNC_FETCH_CONCURRENTLY active workers
    const activeWorkers = new Set<Promise<void>>()
    let nextAddressIndex = 0

    // Function to process a single address
    const processAddress = async (address: Address, addressIndex: number): Promise<void> => {
      const addrLogPrefix = `${logPrefix} > ${address.address}: (${addressIndex + 1}/${totalCount})`
      const lastSyncedTimestampSeconds = this.getLastSyncTs(address)
      const txThresholdFilter = this.txThesholdFilter(address)

      let nextBurstBasePageIndex = 0
      let hasReachedStoppingCondition = false
      let newTxs = 0
      const addressStartedAt = Date.now()
      let chronikMs = 0
      let pagesFetched = 0

      try {
        while (!hasReachedStoppingCondition) {
          await waitWhilePaused()

          const pageIndex = nextBurstBasePageIndex
          let pageTxs: Tx[] = []

          const pageStartedAt = Date.now()
          try {
            pageTxs = await this.getPaginatedTxs(address.address, pageIndex, CHRONIK_FETCH_N_TXS_PER_PAGE)
            pagesFetched++
          } catch (err: any) {
            console.warn(`${addrLogPrefix} page=${pageIndex} failed: ${err.message as string}`)
            pageTxs = []
          } finally {
            chronikMs += Date.now() - pageStartedAt
          }

          if (pageIndex === 0 && pageTxs.length > 0 && lastSyncedTimestampSeconds === 0) {
            console.log(`${addrLogPrefix} never synced (no lastSynced), fetching its full history.`)
          }

          if (pageIndex === 0 && pageTxs.length === 0) {
            console.log(`${addrLogPrefix} EMPTY ADDRESS`)
            break
          }

          if (pageTxs.length < CHRONIK_FETCH_N_TXS_PER_PAGE) {
            hasReachedStoppingCondition = true
          }

          const newestTs = Number(pageTxs[0].block?.timestamp ?? pageTxs[0].timeFirstSeen)

          if (newestTs < lastSyncedTimestampSeconds) {
            console.log(`${addrLogPrefix} NO NEW TXS`)
            break
          }

          const oldestTs = Number(pageTxs[pageTxs.length - 1].block?.timestamp ?? pageTxs[pageTxs.length - 1].timeFirstSeen)

          pageTxs = pageTxs
            .filter(txThresholdFilter)
            .filter(t => t.block === undefined || t.block.timestamp >= lastSyncedTimestampSeconds)

          const newTxsInThisPage = pageTxs.length
          if (newTxsInThisPage > 0) {
            chronikTxs.push(...pageTxs.map(tx => ({ tx, address })))
            pageTxs = []
          }

          if (oldestTs < lastSyncedTimestampSeconds) {
            hasReachedStoppingCondition = true
          }

          nextBurstBasePageIndex += 1
          if (newTxsInThisPage === 0 && oldestTs < lastSyncedTimestampSeconds) {
            hasReachedStoppingCondition = true
          }
          newTxs += newTxsInThisPage
        }
      } catch (err: any) {
        console.error(`${logPrefix}: address job failed: ${err.message as string}`)
      } finally {
        const ms = Date.now() - addressStartedAt
        addressTimings.push({ address: address.address, ms, chronikMs, pages: pagesFetched, newTxs })
        if (newTxs > 0 || ms > SLOW_ADDRESS_SYNC_LOG_THRESHOLD) {
          console.log(
            `${addrLogPrefix} ${newTxs} new txs, ${pagesFetched} pages in ${(ms / 1000).toFixed(1)}s ` +
            `(chronik ${(chronikMs / 1000).toFixed(1)}s, waited ${((ms - chronikMs) / 1000).toFixed(1)}s).`
          )
        }
        completedAddresses.push(address.address)
      }
    }

    // Start next worker from the queue
    const startNextWorker = (): void => {
      if (nextAddressIndex >= totalCount) {
        // No more addresses
        return
      }

      const currentIndex = nextAddressIndex
      nextAddressIndex++

      const workerPromise = processAddress(addresses[currentIndex], currentIndex).finally(() => {
        activeWorkers.delete(workerPromise)
        // Immediately start next worker if queue has more
        startNextWorker()
      })
      activeWorkers.add(workerPromise)
    }

    // Start initial batch of workers
    const initialBatchSize = Math.min(INITIAL_ADDRESS_SYNC_FETCH_CONCURRENTLY, totalCount)
    for (let i = 0; i < initialBatchSize; i++) {
      startNextWorker()
    }

    // Poll and yield batches while workers are active
    while (activeWorkers.size > 0 || chronikTxs.length > 0) {
      if (chronikTxs.length >= TX_EMIT_BATCH_SIZE) {
        yield * runDrainCycle()
        continue
      }

      // If no active workers, yield any remaining transactions (even if < batch size)
      if (activeWorkers.size === 0 && chronikTxs.length > 0) {
        const remaining = chronikTxs.splice(0)
        yield {
          phase: 'tx-drain',
          chronikTxs: remaining,
          addressesSynced: []
        }
      }

      // Yield completed addresses if any (not during an active drain pause)
      if (completedAddresses.length > 0 && !producersPaused) {
        const completed = completedAddresses.splice(0)
        yield {
          phase: 'addresses-synced',
          chronikTxs: [],
          addressesSynced: completed
        }
      }

      // If no active workers and no more transactions, break
      if (activeWorkers.size === 0 && chronikTxs.length === 0) {
        break
      }

      // Wait a bit for more transactions or worker completion
      await Promise.race([
        Promise.all(Array.from(activeWorkers)).then(() => true),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), TX_BATCH_POLLING_DELAY))
      ])
    }

    // Wait for all workers to finish (should already be done)
    if (activeWorkers.size > 0) {
      await Promise.all(Array.from(activeWorkers))
    }

    this.logSyncTimings(logPrefix, fetchStartedAt, addressTimings)

    // Final TX flush after all addresses processed
    if (chronikTxs.length >= TX_EMIT_BATCH_SIZE) {
      yield * runDrainCycle()
    } else if (chronikTxs.length > 0) {
      const remaining = chronikTxs.splice(0)
      yield {
        phase: 'tx-drain',
        chronikTxs: remaining,
        addressesSynced: []
      }
    }
  }

  public async * syncTransactionsForAddress (address: Address, fully = false, runTriggers = false): AsyncGenerator<TransactionWithAddressAndPrices[]> {
    const pageSize = CHRONIK_FETCH_N_TXS_PER_PAGE
    let page = 0
    const earliestUnconfirmedTxTimestamp = await getEarliestUnconfirmedTxTimestampForAddress(address.id)
    const latestTimestamp = earliestUnconfirmedTxTimestamp ?? await getLatestConfirmedTxTimestampForAddress(address.id) ?? 0
    let maxTimestamp = 0

    while (true) {
      let transactions = await this.getPaginatedTxs(address.address, page, pageSize)

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

      const transactionsToPersist = [...confirmedTransactions, ...unconfirmedTransactions].map(tx => this.getTransactionFromChronikTransaction(tx, address))
      const persistedTransactions = await createManyTransactions(transactionsToPersist)
      if (persistedTransactions.length > 0) {
        // Track the max timestamp from persisted transactions
        for (const tx of persistedTransactions) {
          maxTimestamp = Math.max(maxTimestamp, tx.timestamp)
        }

        const simplifiedTransactions = getSimplifiedTransactions(persistedTransactions)

        console.log(`${this.CHRONIK_MSG_PREFIX}: added ${simplifiedTransactions.length} txs to ${address.address}`)

        const broadcastTxData: BroadcastTxData = {} as BroadcastTxData
        broadcastTxData.messageType = 'OldTx'
        broadcastTxData.address = address.address
        broadcastTxData.txs = simplifiedTransactions

        this.wsEndpoint.emit(SOCKET_MESSAGES.TXS_BROADCAST, broadcastTxData)
        if (runTriggers) {
          await executeAddressTriggers(broadcastTxData, this.networkId)
        }
      }

      yield persistedTransactions
    }
    await setSyncing(address.address, false)

    // Only update lastSynced if new value is greater than current (or if current is null)
    const currentAddress = await prisma.address.findUnique({
      where: { address: address.address },
      select: { lastSynced: true }
    })
    const currentLastSynced = currentAddress?.lastSynced ?? null
    const newDate = new Date(maxTimestamp * 1000)

    if ((currentLastSynced == null) || currentLastSynced < newDate) {
      await updateLastSynced(address.address, maxTimestamp)
    }
  }

  private async getUtxos (address: string): Promise<ScriptUtxo[]> {
    const { type, hash160 } = toHash160(address)
    const scriptsUtxos = await this.chronikCallWithRetry(
      `script utxos ${address}`,
      async () => await this.chronik.script(type, hash160).utxos()
    )
    return scriptsUtxos.utxos
  }

  public async getBalance (address: string): Promise<bigint> {
    const utxos = await this.getUtxos(address)
    return utxos.reduce((acc, utxo) => acc + utxo.sats, 0n)
  }

  async getTransactionDetails (hash: string): Promise<TransactionDetails> {
    const tx = await this.chronikCallWithRetry(
      `tx ${hash}`,
      async () => await this.chronik.tx(hash)
    )

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
        value: input.sats,
        address: outputScriptToAddress(this.networkSlug, input.outputScript)
      })
    }
    for (const output of tx.outputs) {
      details.outputs.push({
        value: output.sats,
        address: outputScriptToAddress(this.networkSlug, output.outputScript)
      })
    }
    return details
  }

  private getWsConfig (generation: number): WsConfig {
    return {
      onMessage: (msg: WsMsgClient) => { void this.processWsMessage(msg) },
      onError: (e: ws.ErrorEvent) => { console.log(`${this.CHRONIK_MSG_PREFIX}: Chronik webSocket error, type: ${e.type} | message: ${e.message} | error: ${e.error as string}`) },
      onConnect: (_: ws.Event) => { console.log(`${this.CHRONIK_MSG_PREFIX}: Chronik webSocket connection (re)established.`) },
      // chronik-client's own reconnect is unreliable: a socket error marks the
      // endpoint as manually closed (so it never reconnects), and a failed failover
      // round is not retried. With autoReconnect off every close ends up in onEnd
      // (onReconnect is never called), and we reconnect from there ourselves.
      onEnd: (e: ws.Event) => {
        // The close code tells who ended it: 1006 means the connection dropped
        // without a close frame (network/NAT/firewall), while 1000/1001 or other
        // codes with a reason mean the server or a proxy closed it on purpose.
        const { code, reason, wasClean } = e as ws.CloseEvent
        console.log(`${this.CHRONIK_MSG_PREFIX}: Chronik WebSocket ended, type: ${e.type}, code: ${code}, reason: ${reason === '' ? '(none)' : reason}, clean: ${String(wasClean)}.`)
        void this.handleWsEnded(generation)
      },
      autoReconnect: false
    }
  }

  private getSortedInputAddresses (transaction: Tx): Array<{address: string, index: number, amount: Prisma.Decimal}> {
    const addressSatsMap = new Map<string, bigint>()
    transaction.inputs.forEach((inp) => {
      const address = outputScriptToAddress(this.networkSlug, inp.outputScript)
      if (address !== undefined && address !== '') {
        const currentValue = addressSatsMap.get(address) ?? 0n
        addressSatsMap.set(address, currentValue + inp.sats)
      }
    })
    const unitDivisor = this.networkId === XEC_NETWORK_ID
      ? 1e2
      : (this.networkId === BCH_NETWORK_ID ? 1e8 : 1)
    const result: Array<{address: string, index: number, amount: Prisma.Decimal}> = []
    let index = 0
    for (const [address, sats] of addressSatsMap.entries()) {
      const decimal = new Prisma.Decimal(sats.toString())
      const amount = decimal.dividedBy(unitDivisor)
      result.push({ address, index, amount })
      index++
    }
    return result
  }

  private getSortedOutputAddresses (transaction: Tx): Array<{address: string, index: number, amount: Prisma.Decimal}> {
    const addressSatsMap = new Map<string, bigint>()
    transaction.outputs.forEach((out) => {
      const address = outputScriptToAddress(this.networkSlug, out.outputScript)
      if (address !== undefined && address !== '') {
        const currentValue = addressSatsMap.get(address) ?? 0n
        addressSatsMap.set(address, currentValue + out.sats)
      }
    })
    const unitDivisor = this.networkId === XEC_NETWORK_ID
      ? 1e2
      : (this.networkId === BCH_NETWORK_ID ? 1e8 : 1)
    const result: Array<{address: string, index: number, amount: Prisma.Decimal}> = []
    let index = 0
    for (const [address, sats] of addressSatsMap.entries()) {
      const decimal = new Prisma.Decimal(sats.toString())
      const amount = decimal.dividedBy(unitDivisor)
      result.push({ address, index, amount })
      index++
    }
    return result
  }

  public async waitForSyncing (txId: string, addressStringArray: string[]): Promise<void> {
    if (!this.initializing) return
    console.log(`${this.CHRONIK_MSG_PREFIX}: Waiting unblocking addresses for ${txId}`)
    while (true) {
      const addresses = await fetchAddressesArray(addressStringArray)
      if (addresses.every(a => !a.syncing)) {
        console.log(`${this.CHRONIK_MSG_PREFIX}: Finished unblocking addresses for ${txId}`)
        return
      }
      await new Promise(resolve => setTimeout(resolve, CHRONIK_INITIALIZATION_DELAY))
    }
  }

  private async handleUpdateClientPaymentStatus (
    txAmount: string | number | Prisma.Decimal | DecimalJsLike,
    opReturn: string | undefined, status: ClientPaymentStatus,
    txAddress: string): Promise<void> {
    const parsedOpReturn = parseOpReturnData(opReturn ?? '')
    const paymentId = parsedOpReturn.paymentId
    if (paymentId === undefined || paymentId === '') {
      return
    }
    const clientPayment = await getClientPayment(paymentId)
    if (clientPayment === null || clientPayment.status === 'CONFIRMED') {
      return
    }
    if (clientPayment.amount !== null) {
      if (Number(clientPayment.amount) === Number(txAmount) &&
        (clientPayment.addressString === txAddress)) {
        await updateClientPaymentStatus(paymentId, status)
      }
    } else {
      if (clientPayment.addressString === txAddress) {
        await updateClientPaymentStatus(paymentId, status)
      }
    }
  }

  private async fetchTxWithRetry (
    txid: string,
    tries = CHRONIK_HTTP_MAX_TRIES,
    delayMs = CHRONIK_HTTP_BASE_DELAY_MS
  ): Promise<Tx> {
    return await this.chronikCallWithRetry(
      `tx ${txid}`,
      async () => await this.chronik.tx(txid),
      tries,
      delayMs
    )
  }

  private async processWsMessage (msg: WsMsgClient): Promise<void> {
    if (msg.type === 'Tx') {
      // delete unconfirmed transaction from our database
      // if they were cancelled and not confirmed
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
        if (this.isAlreadyBeingProcessed(msg.txid, true)) return

        while (this.confirmedTxsBeingProcessed >= MAX_CONFIRMED_TXS_TO_PROCESS_AT_A_TIME) {
          await new Promise(resolve => setTimeout(resolve, CONFIRMED_TX_PROCESS_DELAY))
        }

        this.confirmedTxsBeingProcessed += 1
        try {
          const transaction = await this.fetchTxWithRetry(msg.txid)
          const addressesWithTransactions = await this.getAddressesForTransaction(transaction)
          console.log(`${this.CHRONIK_MSG_PREFIX}: [${msg.msgType}] ${msg.txid}`)
          this.confirmedTxsHashesFromLastBlock = [...this.confirmedTxsHashesFromLastBlock, msg.txid]
          for (const addressWithTransaction of addressesWithTransactions) {
            const { amount, opReturn } = addressWithTransaction.transaction
            await this.handleUpdateClientPaymentStatus(amount, opReturn, 'CONFIRMED' as ClientPaymentStatus, addressWithTransaction.address.address)
          }
        } catch (e: any) {
          const msg404 = String(e?.message ?? e)
          const is404 = /not found in the index|404/.test(msg404)
          if (is404) {
            console.log(`${this.CHRONIK_MSG_PREFIX}: [${msg.msgType}] tx ${msg.txid} not found in chronik, marking as orphaned`)
            await markTransactionsOrphaned(msg.txid)
          } else {
            console.error(`${this.CHRONIK_MSG_PREFIX}: confirmed tx handler failed for ${msg.txid}`, e)
            const { [msg.txid]: _, ...rest } = this.lastProcessedMessages.confirmed
            this.lastProcessedMessages.confirmed = rest
          }
        } finally {
          this.confirmedTxsBeingProcessed = Math.max(0, this.confirmedTxsBeingProcessed - 1)
        }
      } else if (msg.msgType === 'TX_ADDED_TO_MEMPOOL') {
        if (this.isAlreadyBeingProcessed(msg.txid, false)) return

        while (this.mempoolTxsBeingProcessed >= MAX_MEMPOOL_TXS_TO_PROCESS_AT_A_TIME) {
          await new Promise(resolve => setTimeout(resolve, MEMPOOL_PROCESS_DELAY))
        }

        this.mempoolTxsBeingProcessed += 1
        try {
          console.log(`${this.CHRONIK_MSG_PREFIX}: [${msg.msgType}] ${msg.txid}`)
          const transaction = await this.fetchTxWithRetry(msg.txid)
          const addressesWithTransactions = await this.getAddressesForTransaction(transaction)
          await this.waitForSyncing(msg.txid, addressesWithTransactions.map(obj => obj.address.address))

          for (const addressWithTransaction of addressesWithTransactions) {
            const { created, tx } = await upsertTransaction(addressWithTransaction.transaction)
            if (tx !== undefined) {
              const broadcastTxData = this.broadcastIncomingTx(addressWithTransaction.address.address, transaction, tx)
              if (created) { // only execute trigger for newly added txs
                await executeAddressTriggers(broadcastTxData, tx.address.networkId)
              }
              const { amount, opReturn } = addressWithTransaction.transaction
              await this.handleUpdateClientPaymentStatus(amount, opReturn, 'ADDED_TO_MEMPOOL' as ClientPaymentStatus, addressWithTransaction.address.address)
            }
          }
          this.reviveUnsubscribedAddresses(addressesWithTransactions.map(a => a.address))
        } catch (e) {
          console.error(`${this.CHRONIK_MSG_PREFIX}: mempool handler failed for ${msg.txid}`, e)
        } finally {
          this.mempoolTxsBeingProcessed = Math.max(0, this.mempoolTxsBeingProcessed - 1)
        }
      }
    } else if (msg.type === 'Block') {
      console.log(`${this.CHRONIK_MSG_PREFIX}: [${msg.msgType}] Height: ${msg.blockHeight} Hash: ${msg.blockHash}`)
      if (msg.msgType === 'BLK_FINALIZED') {
        console.log(`${this.CHRONIK_MSG_PREFIX}: [${msg.msgType}] Syncing ${this.confirmedTxsHashesFromLastBlock.length} txs on the block...`)
        while (this.initializing) {
          await new Promise(resolve => setTimeout(resolve, CHRONIK_INITIALIZATION_DELAY))
        }
        await this.syncBlockTransactions(msg.blockHash)
        console.log(`${this.CHRONIK_MSG_PREFIX}: [${msg.msgType}] Syncing done.`)
        const subsCount = this.chronikWSEndpoint.subs.scripts.length
        console.log(`${this.CHRONIK_MSG_PREFIX}: [INFO] *Currently Subscribed to ${subsCount} addresses*`)
        this.confirmedTxsHashesFromLastBlock = []
      }
    } else if (msg.type === 'Error') {
      console.log(`${this.CHRONIK_MSG_PREFIX}: [${msg.type}] ${JSON.stringify(msg.msg)}`)
    }
  }

  private broadcastIncomingTxFromSyncRow (
    addressString: string,
    chronikTx: Tx,
    createdTx: SyncPersistedTransaction,
    opReturn: string
  ): BroadcastTxData {
    const broadcastTxData: BroadcastTxData = {} as BroadcastTxData
    broadcastTxData.address = addressString
    broadcastTxData.messageType = 'NewTx'
    const inputAddresses = this.getSortedInputAddresses(chronikTx)
    const outputAddresses = this.getSortedOutputAddresses(chronikTx)
    const stubTx = {
      hash: createdTx.hash,
      amount: createdTx.amount,
      confirmed: createdTx.confirmed,
      opReturn,
      timestamp: createdTx.timestamp,
      address: { address: addressString },
      prices: [],
      inputs: []
    } as unknown as TransactionWithAddressAndPrices
    const newSimplifiedTransaction = getSimplifiedTrasaction(
      stubTx,
      inputAddresses,
      outputAddresses
    )
    broadcastTxData.txs = [newSimplifiedTransaction]
    try {
      this.wsEndpoint.emit(SOCKET_MESSAGES.TXS_BROADCAST, broadcastTxData)
    } catch (err: any) {
      console.error(RESPONSE_MESSAGES.COULD_NOT_BROADCAST_TX_TO_WS_SERVER_500.message, err.stack)
    }
    return broadcastTxData
  }

  private broadcastIncomingTx (addressString: string, chronikTx: Tx, createdTx: TransactionWithAddressAndPrices): BroadcastTxData {
    const broadcastTxData: BroadcastTxData = {} as BroadcastTxData
    broadcastTxData.address = addressString
    broadcastTxData.messageType = 'NewTx'
    const inputAddresses = this.getSortedInputAddresses(chronikTx)
    const outputAddresses = this.getSortedOutputAddresses(chronikTx)
    const newSimplifiedTransaction = getSimplifiedTrasaction(createdTx, inputAddresses, outputAddresses)
    broadcastTxData.txs = [newSimplifiedTransaction]
    try { // emit broadcast for both unconfirmed and confirmed txs
      this.wsEndpoint.emit(SOCKET_MESSAGES.TXS_BROADCAST, broadcastTxData)
    } catch (err: any) {
      console.error(RESPONSE_MESSAGES.COULD_NOT_BROADCAST_TX_TO_WS_SERVER_500.message, err.stack)
    }
    return broadcastTxData
  }

  private async getBlockTxsPage (
    blockHash: string,
    page: number,
    pageSize: number
  ): Promise<Tx[]> {
    const blockPage = await this.chronikCallWithRetry(
      `blockTxs ${blockHash} page ${page}`,
      async () => await this.chronik.blockTxs(blockHash, page, pageSize)
    )
    return blockPage.txs
  }

  private async syncBlockTransactions (blockHash: string): Promise<void> {
    let page = 0
    const pageSize = 200
    let blockPageTxs = await this.getBlockTxsPage(blockHash, page, pageSize)
    let blockTxsToSync: Tx[] = []
    const confirmedTxHashes = new Set(this.confirmedTxsHashesFromLastBlock)
    while (blockPageTxs.length > 0 && blockTxsToSync.length < confirmedTxHashes.size) {
      const thisBlockTxsToSync = blockPageTxs.filter(tx => confirmedTxHashes.has(tx.txid))
      blockTxsToSync = [...blockTxsToSync, ...thisBlockTxsToSync]
      page += 1
      blockPageTxs = await this.getBlockTxsPage(blockHash, page, pageSize)
    }
    for (const transaction of blockTxsToSync) {
      const addressesWithTransactions = await this.getAddressesForTransaction(transaction)

      for (const addressWithTransaction of addressesWithTransactions) {
        const { created, tx } = await upsertTransaction(addressWithTransaction.transaction)
        if (tx !== undefined) {
          const broadcastTxData = this.broadcastIncomingTx(addressWithTransaction.address.address, transaction, tx)
          if (created) { // only execute trigger for newly added txs
            await executeAddressTriggers(broadcastTxData, tx.address.networkId)
          }
        }
      }
      this.reviveUnsubscribedAddresses(addressesWithTransactions.map(a => a.address))
    }
  }

  private getRelatedAddressesForTransaction (transaction: Tx): string[] {
    const inputAddresses = transaction.inputs.map(inp => outputScriptToAddress(this.networkSlug, inp.outputScript))
    const outputAddresses = transaction.outputs.map(out => outputScriptToAddress(this.networkSlug, out.outputScript))
    return [...inputAddresses, ...outputAddresses].filter(a => a !== undefined)
  }

  private async getAddressesForTransaction (transaction: Tx): Promise<AddressWithTransaction[]> {
    const relatedAddresses = this.getRelatedAddressesForTransaction(transaction)
    const addressesFromStringArray = await fetchAddressesArray(relatedAddresses)
    const addressesWithTransactions: AddressWithTransaction[] = addressesFromStringArray.map(
      address => {
        return {
          address,
          transaction: this.getTransactionFromChronikTransaction(transaction, address)
        }
      }
    )
    const zero = new Prisma.Decimal(0)
    return addressesWithTransactions.filter(
      addressWithTransaction => !(zero.equals(addressWithTransaction.transaction.amount as Prisma.Decimal))
    )
  }

  public async subscribeAddresses (addresses: Address[]): Promise<SubscriptionReturn> {
    const failedAddressesWithErrors: KeyValueT<string> = {}
    const subscribedAddresses = this.getSubscribedAddresses()
    addresses = addresses
      .filter(addr => (
        addr.networkId === this.networkId &&
      !subscribedAddresses.includes(addr.address))
      )
    if (addresses.length === 0) return { failedAddressesWithErrors }

    await Promise.all(
      addresses.map(async (address) => {
        try {
          this.chronikWSEndpoint.subscribeToAddress(address.address)
        } catch (err: any) {
          failedAddressesWithErrors[address.address] = err.stack
        }
      })
    )
    return {
      failedAddressesWithErrors
    }
  }

  private async commitTransactionsBatch (
    commitTuples: Array<{ row: Prisma.TransactionUncheckedCreateInput, raw: Tx, addressString: string }>,
    productionAddressesIds: string[],
    runTriggers: boolean,
    reconcileClientPayments = false
  ): Promise<string[]> {
    const rows = commitTuples.map(p => p.row)
    const rowsToUpsert = await filterRowsNeedingCreateMany(rows)
    const syncResult = await createManyTransactionsForSync(rowsToUpsert)
    console.log(
      `${this.CHRONIK_MSG_PREFIX} committed — created=${syncResult.insertedCount}/` +
      `${commitTuples.length}`
    )

    // Addresses whose cached payments/balance are now stale.
    const addressStringById = new Map(commitTuples.map(t => [t.row.addressId, t.addressString]))
    const changedAddresses = [...new Set([
      ...syncResult.inserted.map(t => t.addressId),
      ...syncResult.updatedAddressIds
    ])]
      .map(id => addressStringById.get(id))
      .filter((a): a is string => a !== undefined)

    // Link prices batch by batch instead of only at the end of the sync job, so
    // an interrupted sync (restart, deploy) doesn't leave everything unpriced.
    // A failure here is not fatal: connectAllTransactionsToPrices retries later.
    let linkedAddresses: string[] = []
    if (syncResult.inserted.length > 0) {
      try {
        const linkedIds = new Set(await connectTransactionsListToPrices(
          syncResult.inserted.map(t => ({ ...t, address: { networkId: this.networkId } })),
          { skipUnlink: true }
        ))
        linkedAddresses = syncResult.inserted
          .filter(t => linkedIds.has(t.id))
          .map(t => addressStringById.get(t.addressId))
          .filter((a): a is string => a !== undefined)
      } catch (err: any) {
        console.error(`${this.CHRONIK_MSG_PREFIX}: Failed to link prices for ${syncResult.inserted.length} synced txs: ${err.message as string}`)
      }
    }

    // The bulk path doesn't update cached payments, so drop the caches of addresses
    // with newly priced or updated txs now instead of waiting for the end of the
    // sync, which an interrupted sync never reaches (and the next sync won't see
    // these txs as changed again). Txs left unpriced are invalidated by
    // connectAllTransactionsToPrices once it links them.
    const updatedAddresses = syncResult.updatedAddressIds
      .map(id => addressStringById.get(id))
      .filter((a): a is string => a !== undefined)
    const addressesToInvalidate = [...new Set([...linkedAddresses, ...updatedAddresses])]
    if (addressesToInvalidate.length > 0) {
      await invalidateCachesForAddresses(addressesToInvalidate)
    }

    const createdForProd = syncResult.inserted.filter(t =>
      productionAddressesIds.includes(t.addressId)
    )
    if (createdForProd.length > 0) {
      await appendTxsToFile(createdForProd)
    }

    if (runTriggers && syncResult.inserted.length > 0) {
      const triggerBatch: BroadcastTxData[] = []
      for (const createdTx of syncResult.inserted) {
        const tuple = commitTuples.find(
          t => t.row.hash === createdTx.hash && t.row.addressId === createdTx.addressId
        )
        if (tuple == null) {
          continue
        }
        const opReturn = typeof tuple.row.opReturn === 'string' ? tuple.row.opReturn : ''
        const bd = this.broadcastIncomingTxFromSyncRow(
          tuple.addressString,
          tuple.raw,
          createdTx,
          opReturn
        )
        triggerBatch.push(bd)
      }
      if (triggerBatch.length > 0) {
        await executeTriggersBatch(triggerBatch, this.networkId)
      }
      triggerBatch.length = 0
    }

    if (reconcileClientPayments) {
      await this.reconcileClientPaymentsForBatch(commitTuples)
    }

    // Get the latest timestamp of all committed transactions (including pre-existent) for each address.
    // This is redundant under normal circumstances, but is more robust than only updating for the newly created transactions.
    const addressMaxTimestamp = new Map<string, number>()
    for (const { row, addressString } of commitTuples) {
      const currentMax = addressMaxTimestamp.get(addressString) ?? 0
      addressMaxTimestamp.set(addressString, Math.max(currentMax, row.timestamp))
    }

    // Fetch current lastSynced values for all addresses
    const addressesToUpdate = Array.from(addressMaxTimestamp.keys())
    const currentAddresses = await prisma.address.findMany({
      where: {
        address: { in: addressesToUpdate }
      },
      select: {
        address: true,
        lastSynced: true
      }
    })
    const currentLastSyncedMap = new Map<string, Date | null>(
      currentAddresses.map((a: { address: string, lastSynced: Date | null }) => [a.address, a.lastSynced])
    )

    // Update lastSynced for the processed addresses (only if new value is greater)
    for (const [addr, maxTs] of addressMaxTimestamp) {
      const currentLastSynced = currentLastSyncedMap.get(addr)
      const newDate = new Date(maxTs * 1000)

      // Only update if new value is greater than current (or if current is null)
      if ((currentLastSynced == null) || currentLastSynced < newDate) {
        try {
          await updateLastSynced(addr, maxTs)
        } catch (err: any) {
          console.error(`${this.CHRONIK_MSG_PREFIX}: Failed to update lastSynced for ${addr}: ${err.message as string}`)
        }
      }
    }
    return changedAddresses
  }

  // Applies the live WS handlers' client payment rules to synced txs, whose
  // messages were missed: a confirmed tx sets its client payment to CONFIRMED,
  // an unconfirmed one to ADDED_TO_MEMPOOL. Covers every tx in the batch, not
  // only new rows, so a tx first seen before a disconnect and confirmed during
  // it is reconciled too. A failure is logged and doesn't fail the batch.
  private async reconcileClientPaymentsForBatch (
    commitTuples: Array<{ row: Prisma.TransactionUncheckedCreateInput, addressString: string }>
  ): Promise<void> {
    const zero = new Prisma.Decimal(0)
    for (const { row, addressString } of commitTuples) {
      // Same filter as getAddressesForTransaction in the live handlers.
      if (zero.equals(row.amount as Prisma.Decimal)) continue
      const opReturn = typeof row.opReturn === 'string' ? row.opReturn : undefined
      const status: ClientPaymentStatus = row.confirmed === true ? 'CONFIRMED' : 'ADDED_TO_MEMPOOL'
      try {
        await this.handleUpdateClientPaymentStatus(row.amount, opReturn, status, addressString)
      } catch (err: any) {
        console.error(`${this.CHRONIK_MSG_PREFIX}: Failed to reconcile client payment for ${row.hash} (${addressString}): ${err.message as string}`)
      }
    }
  }

  // reconcileClientPayments: also update client payment statuses as the live WS
  // handlers would (used by the post-reconnect backfill).
  public async syncAddresses (addresses: Address[], runTriggers = false, reconcileClientPayments = false, progress?: SyncProgressTracker): Promise<SyncAndSubscriptionReturn> {
    const failedAddressesWithErrors: KeyValueT<string> = {}
    const successfulAddressesWithCount: KeyValueT<number> = {}
    const productionAddressesIds = productionAddresses.filter(a => a.networkId === this.networkId).map(a => a.id)

    progress?.startNetwork(this.networkSlug, addresses.length)
    if (addresses.length === 0) {
      progress?.finishNetwork(this.networkSlug)
      return { failedAddressesWithErrors, successfulAddressesWithCount, changedAddresses: [] }
    }

    console.log(`${this.CHRONIK_MSG_PREFIX} Syncing ${addresses.length} addresses...`)
    console.time(`${this.CHRONIK_MSG_PREFIX} syncAddresses`)
    await setSyncingBatch(addresses.map(a => a.address), true)

    const perAddrCount = new Map<string, number>()
    addresses.forEach(a => perAddrCount.set(a.id, 0))

    interface RowWithRaw { row: Prisma.TransactionUncheckedCreateInput, raw: Tx, addressString: string }
    let toCommit: RowWithRaw[] = []
    const changedAddresses = new Set<string>()
    // A commit that throws may have persisted some rows (inserts and update
    // groups commit separately, and follow-up work runs after both), so which
    // addresses changed is then unknown.
    let changedAddressesUnknown = false
    const commit = async (tuples: RowWithRaw[]): Promise<void> => {
      try {
        const changed = await this.commitTransactionsBatch(tuples, productionAddressesIds, runTriggers, reconcileClientPayments)
        changed.forEach(a => changedAddresses.add(a))
        progress?.txsCommitted(this.networkSlug, tuples.length)
      } catch (err) {
        changedAddressesUnknown = true
        throw err
      }
    }

    try {
      const pfx = `${this.CHRONIK_MSG_PREFIX}[PARALLEL FETCHING]`
      console.log(`${pfx} will fetch batches of ${INITIAL_ADDRESS_SYNC_FETCH_CONCURRENTLY} addresses from chronik`)

      for await (const batch of this.fetchLatestTxsForAddresses(addresses)) {
        if (batch.phase === 'addresses-synced') {
          // marcador de slice => desmarca syncing
          await setSyncingBatch(batch.addressesSynced, false)
          progress?.addressesDone(this.networkSlug, batch.addressesSynced.length)
          continue
        }

        if (batch.phase === 'drain-complete') {
          if (toCommit.length > 0) {
            const remainder = toCommit.splice(0)
            await commit(remainder)
            remainder.length = 0
          }
          continue
        }

        if (batch.chronikTxs.length === 0) {
          continue
        }

        const involvedAddrIds = new Set(batch.chronikTxs.map(({ address }) => address.id))

        try {
          const tupleFromBatch: RowWithRaw[] = batch.chronikTxs.map(({ tx, address }) => {
            const row = this.getTransactionFromChronikTransaction(tx, address)
            return { row, raw: tx, addressString: address.address }
          })

          for (const { row } of tupleFromBatch) {
            perAddrCount.set(row.addressId, (perAddrCount.get(row.addressId) ?? 0) + 1)
          }

          toCommit.push(...tupleFromBatch)
          // Release memory
          tupleFromBatch.length = 0

          if (toCommit.length >= DB_COMMIT_BATCH_SIZE) {
            const commitPairs = toCommit.splice(0, DB_COMMIT_BATCH_SIZE)
            await commit(commitPairs)
            // Clear commitPairs
            commitPairs.length = 0
          }
        } catch (err: any) {
          console.error(`${this.CHRONIK_MSG_PREFIX}: ERROR in batch (scoped): ${err.message as string}`)
          // Only mark addresses that were actually in this batch
          for (const a of addresses) {
            if (involvedAddrIds.has(a.id)) {
              failedAddressesWithErrors[a.address] = err.stack ?? String(err)
            }
          }
          continue
        }
      }

      // final DB flush (se sobrou menos que DB_COMMIT_BATCH_SIZE)
      if (toCommit.length > 0) {
        await commit(toCommit)
        toCommit = []
      }

      // build success map
      addresses.forEach(a => {
        successfulAddressesWithCount[a.address] = perAddrCount.get(a.id) ?? 0
      })
    } catch (err: any) {
      console.error(`${this.CHRONIK_MSG_PREFIX}: FATAL ERROR in parallel sync: ${err.message as string}`)
      addresses.forEach(a => {
        if ((perAddrCount.get(a.id) ?? 0) === 0) {
          failedAddressesWithErrors[a.address] = err.stack ?? String(err)
        }
      })
    }

    progress?.addressesFailed(this.networkSlug, failedAddressesWithErrors)
    progress?.finishNetwork(this.networkSlug)

    const failed = Object.keys(failedAddressesWithErrors)
    const total = Object.values(successfulAddressesWithCount).reduce((p, c) => p + c, 0)
    console.log(`${this.CHRONIK_MSG_PREFIX} Finished syncing ${total} txs for ${addresses.length} addresses with ${failed.length} errors.`)
    console.timeEnd(`${this.CHRONIK_MSG_PREFIX} syncAddresses`)

    return {
      failedAddressesWithErrors,
      successfulAddressesWithCount,
      changedAddresses: changedAddressesUnknown ? undefined : [...changedAddresses]
    }
  }

  /**
   * Returns the addresses whose txs changed (new or updated), or undefined if
   * the sync failed in a way that leaves that unknown.
   */
  public async syncMissedTransactions (progress?: SyncProgressTracker): Promise<string[] | undefined> {
    // Expired addresses are left to the app's periodic expiry sweep.
    const addresses = await fetchActiveAddressesForNetworkId(this.networkId)
    this.logExpirySkip('sync', addresses.length)
    try {
      const { failedAddressesWithErrors, successfulAddressesWithCount, changedAddresses } = await this.syncAddresses(addresses, true, false, progress)
      Object.keys(failedAddressesWithErrors).forEach((addr) => {
        console.error(`${this.CHRONIK_MSG_PREFIX}: When syncing missing addresses for address ${addr} encountered error: ${failedAddressesWithErrors[addr]}`)
      })
      console.log(`${this.CHRONIK_MSG_PREFIX}: Missed txs successfully synced per address:`)
      Object.keys(successfulAddressesWithCount).forEach((addr) => {
        if (successfulAddressesWithCount[addr] > 0) {
          console.log(`${this.CHRONIK_MSG_PREFIX}:> ${addr} — ${successfulAddressesWithCount[addr]}.`)
        }
      })
      return changedAddresses
    } catch (err: any) {
      console.error(`${this.CHRONIK_MSG_PREFIX}: ERROR: (skipping anyway) initial missing transactions sync failed: ${err.message as string} ${err.stack as string}`)
      return undefined
    }
  }

  public async subscribeInitialAddresses (): Promise<void> {
    const addresses = await fetchActiveAddressesForNetworkId(this.networkId)
    this.logExpirySkip('subscription', addresses.length)
    try {
      await this.subscribeAddresses(addresses)
    } catch (err: any) {
      console.error(`${this.CHRONIK_MSG_PREFIX}: ERROR: (skipping anyway) initial chronik subscription failed: ${err.message as string} ${err.stack as string}`)
    }
  }

  private logExpirySkip (what: string, activeCount: number): void {
    if (config.addressExpiryDays <= 0) return
    console.log(`${this.CHRONIK_MSG_PREFIX}: ${activeCount} addresses active in the last ${config.addressExpiryDays} days are included in the ${what}; expired addresses are skipped.`)
  }

  public async getLastBlockTimestamp (): Promise<number> {
    const blockchainInfo = await this.getBlockchainInfo(this.networkSlug)
    const lastBlockInfo = await this.getBlockInfo(this.networkSlug, blockchainInfo.height)
    return lastBlockInfo.timestamp
  }
}

export function fromHash160 (networkSlug: string, type: AddressType, hash160: string): string {
  const buffer = Buffer.from(hash160, 'hex')

  // Because ecashaddrjs only accepts Uint8Array as input type, convert
  const hash160ArrayBuffer = new ArrayBuffer(buffer.length)
  const hash160Uint8Array = new Uint8Array(hash160ArrayBuffer)
  for (let i = 0; i < hash160Uint8Array.length; i += 1) {
    hash160Uint8Array[i] = buffer[i]
  }

  return encodeCashAddress(
    networkSlug,
    type,
    hash160Uint8Array
  )
}

export function toHash160 (address: string): {type: AddressType, hash160: string} {
  try {
    const { type, hash } = decodeCashAddress(address)
    return { type, hash160: hash }
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
      addressType = 'p2pkh'
      hash160 = outputScript.substring(
        outputScript.indexOf('76a914') + '76a914'.length,
        outputScript.lastIndexOf('88ac')
      )
      break
    case 'a914':
      addressType = 'p2sh'
      hash160 = outputScript.substring(
        outputScript.indexOf('a914') + 'a914'.length,
        outputScript.lastIndexOf('87')
      )
      break
    default:
      return undefined
  }

  if (hash160.length !== 40) return undefined

  return fromHash160(networkSlug, addressType as AddressType, hash160)
}

class MultiBlockchainClient {
  private clients!: Record<MainNetworkSlugsType, ChronikBlockchainClient>
  public initializing: boolean
  // Revivals in progress, by address, so concurrent requests for the same
  // expired address share one sync.
  private readonly revivalsInFlight = new Map<string, Promise<void>>()
  private expirySweepRunning = false

  constructor () {
    console.log('Initializing MultiBlockchainClient...')
    this.initializing = true
    void (async () => {
      const asyncOperations: Array<Promise<void>> = []
      this.clients = {
        ecash: this.instantiateChronikClient('ecash', asyncOperations),
        bitcoincash: this.instantiateChronikClient('bitcoincash', asyncOperations)
      }
      await Promise.all(asyncOperations)
      this.setInitialized()
      console.log('Finished initializing MultiBlockchainClient.')
      if (this.isRunningApp()) {
        this.scheduleExpirySweep()
      }
    })()
  }

  public setInitialized (): void {
    this.initializing = false
    this.clients.ecash.setInitialized()
    this.clients.bitcoincash.setInitialized()
  }

  public async waitForStart (): Promise<void> {
    while (this.initializing) {
      await new Promise(resolve => setTimeout(resolve, LATENCY_TEST_CHECK_DELAY))
    }
  }

  public getUrls (): Record<MainNetworkSlugsType, string[]> {
    return {
      ecash: this.clients.ecash.getUrls(),
      bitcoincash: this.clients.bitcoincash.getUrls()
    }
  }

  private isRunningApp (): boolean {
    if (
      process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD &&
      process.env.NODE_ENV !== 'test' &&
      process.env.JOBS_ENV === undefined
    ) {
      return true
    }
    return false
  }

  private instantiateChronikClient (networkSlug: string, asyncOperations: Array<Promise<void>>): ChronikBlockchainClient {
    console.log(`[CHRONIK — ${networkSlug}] Instantiating client...`)
    const newClient = new ChronikBlockchainClient(networkSlug)

    // Subscribe addresses & Sync lost transactions on DB upon client initialization
    if (this.isRunningApp()) {
      newClient.onUnsubscribedAddressTx = async (addresses) => await this.reviveAddresses(addresses)
      asyncOperations.push(
        (async () => {
          await newClient.waitForLatencyTest()
          console.log(`[CHRONIK — ${networkSlug}] Subscribing addresses in database...`)
          await newClient.subscribeInitialAddresses()
        })()
      )
    } else if (process.env.NODE_ENV === 'test' || process.env.JOBS_ENV !== undefined) {
      asyncOperations.push(
        (async () => {
          await newClient.waitForLatencyTest()
        })()
      )
    }

    console.log(`Finished instantiating ${networkSlug} client.`)
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
    let failedAddressesWithErrors: KeyValueT<string> = {}
    await Promise.all(
      Object.keys(this.clients).map(async (networkSlug) => {
        const addressesOfNetwork = addresses.filter(
          (address) => address.networkId === NETWORK_IDS[NETWORK_TICKERS[networkSlug]]
        )
        const client = this.clients[networkSlug as MainNetworkSlugsType]
        const thisNetworkRes = await client.subscribeAddresses(addressesOfNetwork)
        failedAddressesWithErrors = { ...failedAddressesWithErrors, ...thisNetworkRes.failedAddressesWithErrors }
      })
    )
    Object.keys(failedAddressesWithErrors).forEach((addr) => {
      console.error(`[CHRONIK]: When syncing missing addresses for address ${addr} encountered error: ${failedAddressesWithErrors[addr]}`)
    })
  }

  public async syncAddresses (addresses: Address[], runTriggers = false, reconcileClientPayments = false): Promise<SyncAndSubscriptionReturn> {
    let failedAddressesWithErrors: KeyValueT<string> = {}
    let successfulAddressesWithCount: KeyValueT<number> = {}
    let changedAddresses: string[] | undefined = []

    for (const networkSlug of Object.keys(this.clients)) {
      const thisNetworkAddresses = addresses.filter(a => a.networkId === NETWORK_IDS_FROM_SLUGS[networkSlug])
      const ret = await this.clients[networkSlug as MainNetworkSlugsType].syncAddresses(thisNetworkAddresses, runTriggers, reconcileClientPayments)
      failedAddressesWithErrors = { ...failedAddressesWithErrors, ...ret.failedAddressesWithErrors }
      successfulAddressesWithCount = { ...successfulAddressesWithCount, ...ret.successfulAddressesWithCount }
      // Unknown for one network means unknown overall.
      changedAddresses = (changedAddresses === undefined || ret.changedAddresses === undefined)
        ? undefined
        : [...changedAddresses, ...ret.changedAddresses]
    }
    return {
      failedAddressesWithErrors,
      successfulAddressesWithCount,
      changedAddresses
    }
  }

  public async getTransactionDetails (hash: string, networkSlug: string): Promise<TransactionDetails> {
    return await this.clients[networkSlug as MainNetworkSlugsType].getTransactionDetails(hash)
  }

  public async getLastBlockTimestamp (networkSlug: string): Promise<number> {
    return await this.clients[networkSlug as MainNetworkSlugsType].getLastBlockTimestamp()
  }

  public async getBalance (address: string): Promise<bigint> {
    const networkSlug = getAddressPrefix(address)
    return await this.clients[networkSlug as MainNetworkSlugsType].getBalance(address)
  }

  /**
   * Returns the addresses whose txs changed during the sync, or undefined if
   * that is unknown for any network (callers should then assume all changed).
   */
  public async syncMissedTransactions (progress?: SyncProgressTracker): Promise<string[] | undefined> {
    await this.waitForStart()
    const bch = await this.clients.bitcoincash.syncMissedTransactions(progress)
    const xec = await this.clients.ecash.syncMissedTransactions(progress)
    if (bch === undefined || xec === undefined) return undefined
    return [...bch, ...xec]
  }

  public async syncAndSubscribeAddresses (addresses: Address[]): Promise<SyncAndSubscriptionReturn> {
    await this.subscribeAddresses(addresses)
    const result = await this.syncCatchingUp(addresses)
    await this.finalizeOnDemandSync(addresses)
    return result
  }

  // Addresses synced before (lastSynced set) are caught up as the live handlers
  // would have processed them: triggers run and client payments are reconciled
  // for the txs found, which only covers txs not already stored. This matters
  // for expired addresses, whose payments arrived while nobody was listening.
  // Addresses never synced get their full history, so no triggers for those.
  private async syncCatchingUp (addresses: Address[]): Promise<SyncAndSubscriptionReturn> {
    const synced = addresses.filter(a => a.lastSynced !== null)
    const neverSynced = addresses.filter(a => a.lastSynced === null)
    const empty: SyncAndSubscriptionReturn = { failedAddressesWithErrors: {}, successfulAddressesWithCount: {}, changedAddresses: [] }
    const a = synced.length > 0 ? await this.syncAddresses(synced, true, true) : empty
    const b = neverSynced.length > 0 ? await this.syncAddresses(neverSynced) : empty
    return {
      failedAddressesWithErrors: { ...a.failedAddressesWithErrors, ...b.failedAddressesWithErrors },
      successfulAddressesWithCount: { ...a.successfulAddressesWithCount, ...b.successfulAddressesWithCount },
      changedAddresses: (a.changedAddresses === undefined || b.changedAddresses === undefined)
        ? undefined
        : [...a.changedAddresses, ...b.changedAddresses]
    }
  }

  /**
   * Subscribes the addresses and syncs what they missed. Concurrent calls for
   * the same address share one sync.
   */
  public async reviveAddresses (addresses: Address[]): Promise<void> {
    const pending: Array<Promise<void>> = []
    const toRevive: Address[] = []
    for (const a of addresses) {
      const inFlight = this.revivalsInFlight.get(a.address)
      if (inFlight !== undefined) pending.push(inFlight)
      else toRevive.push(a)
    }
    if (toRevive.length > 0) {
      console.log(`[ADDRESS EXPIRY]: Reviving ${toRevive.length} addresses...`)
      const run = (async () => {
        try {
          await this.syncAndSubscribeAddresses(toRevive)
        } finally {
          toRevive.forEach(a => this.revivalsInFlight.delete(a.address))
        }
      })()
      toRevive.forEach(a => this.revivalsInFlight.set(a.address, run))
      pending.push(run)
    }
    await Promise.all(pending)
  }

  /**
   * Records activity on the addresses and, for any that had expired, subscribes
   * them and syncs what they missed before returning. Never throws: failing to
   * record activity shouldn't fail the request that caused it.
   */
  public async recordActivity (addresses: Address[]): Promise<void> {
    if (addresses.length === 0) return
    try {
      const expired = addresses.filter(a => isAddressExpired(a))
      await touchAddressActivity(addresses.map(a => a.id))
      if (expired.length > 0) {
        await this.reviveAddresses(expired)
      }
    } catch (err: any) {
      console.error(`[ADDRESS EXPIRY]: Failed to record activity for ${addresses.length} addresses: ${err.message as string}`)
    }
  }

  // Same as recordActivity, by address string. Unknown addresses are ignored.
  public async recordActivityForAddressStrings (addresses: string[]): Promise<void> {
    try {
      await this.recordActivity(await fetchAddressesArray(addresses))
    } catch (err: any) {
      console.error(`[ADDRESS EXPIRY]: Failed to record activity for ${addresses.length} addresses: ${err.message as string}`)
    }
  }

  // Same as recordActivity, by address id.
  public async recordActivityForAddressIds (addressIds: string[]): Promise<void> {
    try {
      await this.recordActivity(await fetchAddressesByIdList(addressIds))
    } catch (err: any) {
      console.error(`[ADDRESS EXPIRY]: Failed to record activity for ${addressIds.length} addresses: ${err.message as string}`)
    }
  }

  // The owner viewing their payments is activity on all their addresses.
  public async recordUserActivity (userId: string): Promise<void> {
    try {
      const expired = await fetchExpiredUserAddresses(userId)
      await touchUserAddressesActivity(userId)
      if (expired.length > 0) {
        await this.reviveAddresses(expired)
      }
    } catch (err: any) {
      console.error(`[ADDRESS EXPIRY]: Failed to record activity for user ${userId}: ${err.message as string}`)
    }
  }

  private scheduleExpirySweep (): void {
    if (config.addressExpiryDays <= 0) return
    const run = (): void => {
      void this.sweepExpiredAddresses().catch((err: any) => {
        console.error(`[ADDRESS EXPIRY]: Sweep failed: ${err.message as string}`)
      })
    }
    setTimeout(() => {
      run()
      setInterval(run, ADDRESS_EXPIRY_SWEEP_INTERVAL).unref()
    }, ADDRESS_EXPIRY_SWEEP_INITIAL_DELAY).unref()
  }

  /**
   * Periodic, low-priority pass over expired addresses, so a payment to a
   * dormant address isn't missed for good:
   * - drops subscriptions of addresses that expired since startup;
   * - syncs expired addresses in small chunks, running triggers for new txs;
   *   addresses that got new txs are active again and get subscribed.
   */
  public async sweepExpiredAddresses (): Promise<void> {
    if (this.expirySweepRunning) return
    this.expirySweepRunning = true
    try {
      for (const client of Object.values(this.clients)) {
        const expired = await fetchExpiredAddressesForNetworkId(client.networkId)
        client.unsubscribeAddresses(expired.map(a => a.address))
        console.log(`${client.CHRONIK_MSG_PREFIX}: [ADDRESS EXPIRY] Sweeping ${expired.length} expired addresses...`)
        let revivedCount = 0
        for (let i = 0; i < expired.length; i += ADDRESS_EXPIRY_SWEEP_BATCH_SIZE) {
          const chunk = expired.slice(i, i + ADDRESS_EXPIRY_SWEEP_BATCH_SIZE)
          const { changedAddresses } = await this.syncCatchingUp(chunk)
          // A new tx records activity on its address, so whatever is no longer
          // expired got one.
          const revived = (await fetchAddressesArray(chunk.map(a => a.address)))
            .filter(a => !isAddressExpired(a))
          if (revived.length > 0) {
            await this.subscribeAddresses(revived)
            revivedCount += revived.length
          }
          const toFinalize = changedAddresses === undefined
            ? chunk
            : chunk.filter(a => changedAddresses.includes(a.address))
          await this.finalizeOnDemandSync(toFinalize)
        }
        console.log(`${client.CHRONIK_MSG_PREFIX}: [ADDRESS EXPIRY] Sweep done, ${revivedCount} addresses revived.`)
      }
    } finally {
      this.expirySweepRunning = false
    }
  }

  // syncAddresses commits through the bulk path, which defers price linking and
  // cache updates to the sync job. On-demand syncs (new paybutton/address, client
  // payment) run outside that job, so link prices and drop stale caches here —
  // otherwise the synced txs stay unpriced and missing from payments until the
  // next restart, and a cache rebuilt mid-sync stays partial.
  private async finalizeOnDemandSync (addresses: Address[]): Promise<void> {
    if (addresses.length === 0) return
    try {
      await connectTransactionsToPricesForAddresses(addresses.map(a => a.id))
    } catch (err: any) {
      console.error(`[CHRONIK]: Failed to link prices after syncing ${addresses.length} addresses: ${err.message as string}`)
    }
    try {
      await CacheSet.addressesSynced(addresses.map(a => a.address))
    } catch (err: any) {
      console.error(`[CHRONIK]: Failed to invalidate caches after syncing ${addresses.length} addresses: ${err.message as string}`)
    }
  }

  public async destroy (): Promise<void> {
    await Promise.all(
      Object.values(this.clients).map(async (c) => {
        try {
          c.closeWs()
          c.wsEndpoint.close()
        } catch (err: any) {
          console.error(`Failed to close connections for client: ${err.message as string}`)
        }
      })
    )
  }
}

export interface NodeJsGlobalMultiBlockchainClient extends NodeJS.Global {
  multiBlockchainClient?: MultiBlockchainClient
}
declare const global: NodeJsGlobalMultiBlockchainClient

if (global.multiBlockchainClient === undefined) {
  global.multiBlockchainClient = new MultiBlockchainClient()
}

export const multiBlockchainClient: MultiBlockchainClient = global.multiBlockchainClient
