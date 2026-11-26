import prisma from 'prisma-local/clientInstance'
import { Prisma, Transaction } from '@prisma/client'
import { RESPONSE_MESSAGES, USD_QUOTE_ID, CAD_QUOTE_ID, N_OF_QUOTES, UPSERT_TRANSACTION_PRICES_ON_DB_TIMEOUT, SupportedQuotesType, NETWORK_IDS, PRICES_CONNECTION_BATCH_SIZE, PRICES_CONNECTION_TIMEOUT, PRICES_CONNECTION_TX_CHUNK_SIZE, UNPRICED_TXS_PAGE_SIZE, SYNC_INSERT_RETRY_DELAY, HUMAN_READABLE_DATE_FORMAT } from 'constants/index'
import { fetchAddressBySubstring, fetchAddressById, fetchAddressesByPaybuttonId, touchAddressActivity } from 'services/addressService'
import { AllPrices, QuoteValues, fetchAndStoreMissingPrices, fetchPricesForNetworkAndTimestamp, flattenTimestamp } from 'services/priceService'
import _ from 'lodash'
import { CacheSet } from 'redis/index'
import { redis } from 'redis/clientInstance'
import { SimplifiedTransaction } from 'ws-service/types'
import { OpReturnData, parseAddress } from 'utils/validators'
import { generatePaymentFromTxWithInvoices } from 'redis/paymentCache'
import { ButtonDisplayData, Payment } from 'redis/types'
import moment from 'moment-timezone'
import { v4 as uuidv4 } from 'uuid'

export function getTransactionValue (transaction: TransactionWithPrices | TransactionsWithPaybuttonsAndPrices | SimplifiedTransaction): QuoteValues {
  const ret: QuoteValues = {
    usd: new Prisma.Decimal(0),
    cad: new Prisma.Decimal(0)
  }
  if (transaction.prices.length !== N_OF_QUOTES) {
    throw new Error(`Error: ${RESPONSE_MESSAGES.MISSING_PRICE_FOR_TRANSACTION_400.message} found ${transaction.prices.length}. txId: ${transaction.hash}, at ${transaction.timestamp}`)
  }
  for (const p of transaction.prices) {
    if (p.price.quoteId === USD_QUOTE_ID) {
      ret.usd = ret.usd.plus(p.price.value.times(transaction.amount))
    }
    if (p.price.quoteId === CAD_QUOTE_ID) {
      ret.cad = ret.cad.plus(p.price.value.times(transaction.amount))
    }
  }
  return ret
}

export function getSimplifiedTransactions (transactionsToPersist: TransactionWithAddressAndPrices[]): SimplifiedTransaction[] {
  const simplifiedTransactions: SimplifiedTransaction[] = []
  transactionsToPersist.forEach(
    tx => {
      const simplifiedTransaction = getSimplifiedTrasaction(tx)

      simplifiedTransactions.push(simplifiedTransaction)
    }
  )
  return simplifiedTransactions
}

export function getSimplifiedTrasaction (tx: TransactionWithAddressAndPrices, inputAddresses?: Array<{address: string, amount: Prisma.Decimal}>, outputAddresses?: Array<{address: string, amount: Prisma.Decimal}>): SimplifiedTransaction {
  const {
    hash,
    amount,
    confirmed,
    opReturn,
    address,
    timestamp
  } = tx

  const parsedOpReturn = resolveOpReturn(opReturn)

  const dbInputsArr = (tx as { inputs?: Array<{ address: string, amount: Prisma.Decimal }> }).inputs
  const resolvedInputAddresses = inputAddresses ?? (Array.isArray(dbInputsArr) ? dbInputsArr.map(i => ({ address: i.address, amount: i.amount })) : [])
  // outputAddresses must be provided as parameter since TransactionOutput is no longer stored in DB
  const resolvedOutputAddresses = outputAddresses ?? []

  const simplifiedTransaction: SimplifiedTransaction = {
    hash,
    amount,
    paymentId: parsedOpReturn?.paymentId ?? '',
    confirmed,
    address: address.address,
    timestamp,
    message: parsedOpReturn?.message ?? '',
    rawMessage: parsedOpReturn?.rawMessage ?? '',
    inputAddresses: resolvedInputAddresses,
    outputAddresses: resolvedOutputAddresses,
    prices: tx.prices
  }

  return simplifiedTransaction
}

const resolveOpReturn = (opReturn: string): OpReturnData | null => {
  try {
    return opReturn === '' ? null : JSON.parse(opReturn)
  } catch (e) {
    console.error(RESPONSE_MESSAGES.FAILED_TO_PARSE_TX_OP_RETURN_500.message)
    return null
  }
}

const includePrices = {
  prices: {
    include: {
      price: true
    }
  }
}

const includeAddressAndPrices = {
  address: true,
  ...includePrices,
  inputs: { orderBy: { index: 'asc' as const } }
}

const transactionWithPrices = Prisma.validator<Prisma.TransactionDefaultArgs>()(
  { include: includePrices }
)

type TransactionWithPrices = Prisma.TransactionGetPayload<typeof transactionWithPrices>

const includeNetwork = {
  address: {
    select: {
      networkId: true
    }
  }
}

const transactionWithAddressAndPrices = Prisma.validator<Prisma.TransactionDefaultArgs>()(
  { include: includeAddressAndPrices }
)

export type TransactionWithAddressAndPrices = Prisma.TransactionGetPayload<typeof transactionWithAddressAndPrices>

const includePaybuttonsAndPrices = {
  address: {
    include: {
      paybuttons: {
        include: {
          paybutton: true
        }
      }
    }
  },
  ...includePrices,
  inputs: { orderBy: { index: 'asc' as const } }
}
export const includePaybuttonsAndPricesAndInvoices = {
  ...includePaybuttonsAndPrices,
  invoices: true
}
const transactionWithAddressAndPricesAndInvoices = Prisma.validator<Prisma.TransactionDefaultArgs>()(
  { include: includePaybuttonsAndPricesAndInvoices }
)
export type TransactionWithAddressAndPricesAndInvoices = Prisma.TransactionGetPayload<typeof transactionWithAddressAndPricesAndInvoices>

const transactionsWithPaybuttonsAndPrices = Prisma.validator<Prisma.TransactionDefaultArgs>()(
  {
    include: includePaybuttonsAndPrices
  }
)

export type TransactionsWithPaybuttonsAndPrices = Prisma.TransactionGetPayload<typeof transactionsWithPaybuttonsAndPrices>

export async function fetchTransactionsByAddressList (
  addressIdList: string[],
  networkIdsListFilter?: number[]
): Promise<TransactionsWithPaybuttonsAndPrices[]> {
  return await prisma.transaction.findMany({
    where: {
      addressId: {
        in: addressIdList
      },
      address: {
        networkId: {
          in: networkIdsListFilter ?? Object.values(NETWORK_IDS)
        }
      }
    },
    include: includePaybuttonsAndPrices,
    orderBy: {
      timestamp: 'asc'
    }
  })
}

type TransactionOrderBy = Prisma.TransactionOrderByWithRelationInput

// Repeated query keys arrive as arrays. Only known fields become Prisma orderBy
// objects; anything else, including arrays, sorts by timestamp.
function transactionOrderBy (orderBy: unknown, orderDesc: boolean): TransactionOrderBy {
  const direction: Prisma.SortOrder = orderDesc ? 'desc' : 'asc'
  if (typeof orderBy !== 'string') {
    return { timestamp: direction }
  }
  switch (orderBy) {
    case 'id':
      return { id: direction }
    case 'hash':
      return { hash: direction }
    case 'amount':
      return { amount: direction }
    case 'confirmed':
      return { confirmed: direction }
    case 'createdAt':
      return { createdAt: direction }
    case 'address.address':
      return { address: { address: direction } }
    case 'address.networkId':
      return { address: { networkId: direction } }
    case 'timestamp':
    default:
      return { timestamp: direction }
  }
}

function paymentOrderBy (orderBy: unknown, orderDesc: boolean): TransactionOrderBy {
  const direction: Prisma.SortOrder = orderDesc ? 'desc' : 'asc'
  if (typeof orderBy !== 'string') {
    return { timestamp: direction }
  }
  switch (orderBy) {
    case 'id':
      return { id: direction }
    case 'hash':
      return { hash: direction }
    case 'amount':
    case 'values':
      return { amount: direction }
    case 'networkId':
      return { address: { networkId: direction } }
    case 'timestamp':
    default:
      return { timestamp: direction }
  }
}

export async function fetchTransactionsByAddressListWithPagination (
  addressIdList: string[],
  page: number,
  pageSize: number,
  orderBy?: string,
  orderDesc = true,
  networkIdsListFilter?: number[],
  includeInputs = false
): Promise<TransactionsWithPaybuttonsAndPrices[]> {
  const orderByQuery = transactionOrderBy(orderBy, orderDesc)

  // Build include conditionally - exclude inputs by default unless explicitly requested
  const include = includeInputs
    ? includePaybuttonsAndPricesAndInvoices
    : (() => {
        const { inputs, ...rest } = includePaybuttonsAndPricesAndInvoices
        return rest
      })()

  return await prisma.transaction.findMany({
    where: {
      addressId: {
        in: addressIdList
      },
      address: {
        networkId: {
          in: networkIdsListFilter ?? Object.values(NETWORK_IDS)
        }
      }
    },
    include,
    orderBy: orderByQuery,
    skip: page * pageSize,
    take: pageSize
  }) as unknown as TransactionsWithPaybuttonsAndPrices[]
}

export async function fetchTxCountByAddressString (addressString: string): Promise<number> {
  return await prisma.transaction.count({
    where: {
      address: {
        address: addressString
      }
    }
  })
}

export async function fetchTransactionWithPaybuttonsAndPrices (txId: string): Promise<TransactionsWithPaybuttonsAndPrices> {
  return await prisma.transaction.findUniqueOrThrow({
    where: {
      id: txId
    },
    include: includePaybuttonsAndPrices
  })
}

export async function fetchTransactionsWithPaybuttonsAndPricesForIdList (txIdList: string[]): Promise<TransactionsWithPaybuttonsAndPrices[]> {
  return await prisma.transaction.findMany({
    where: {
      id: {
        in: txIdList
      }
    },
    include: includePaybuttonsAndPrices
  })
}

export async function * generateTransactionsWithPaybuttonsAndPricesForAddress (addressId: string, pageSize = 1000): AsyncGenerator<TransactionsWithPaybuttonsAndPrices[]> {
  let cursor: string | undefined

  while (true) {
    const txs = await prisma.transaction.findMany({
      where: {
        addressId
      },
      include: {
        address: {
          include: {
            paybuttons: {
              include: {
                paybutton: true
              }
            }
          }
        },
        ...includePrices
      },
      orderBy: {
        timestamp: 'asc'
      },
      ...(cursor !== undefined ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: pageSize
    })
    if (txs.length === 0) break
    cursor = txs[txs.length - 1].id
    yield txs as TransactionsWithPaybuttonsAndPrices[]
  }
}

export async function fetchPaginatedAddressTransactions (addressString: string, page: number, pageSize: number, orderBy?: string, orderDesc = true): Promise<TransactionWithAddressAndPrices[]> {
  const orderByQuery = transactionOrderBy(orderBy, orderDesc)
  const parsedAddress = parseAddress(addressString)
  const address = await prisma.address.findUnique({
    where: {
      address: parsedAddress
    },
    select: {
      id: true
    }
  })
  if (address === null) {
    throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message)
  }
  const txs = await prisma.transaction.findMany({
    where: {
      addressId: address.id
    },
    include: includeAddressAndPrices,
    orderBy: orderByQuery,
    skip: page * pageSize,
    take: pageSize
  })
  return txs
}

export async function fetchAddressTransactions (addressString: string): Promise<TransactionWithAddressAndPrices[]> {
  const address = await fetchAddressBySubstring(addressString)
  const transactions = await prisma.transaction.findMany({
    where: {
      addressId: address.id
    },
    include: includeAddressAndPrices
  })
  return _.orderBy(transactions, ['timestamp'], ['desc'])
}

export async function fetchTransactionById (id: string): Promise<TransactionWithAddressAndPrices> {
  const tx = await prisma.transaction.findUnique({
    where: {
      id
    },
    include: includeAddressAndPrices
  })
  if (tx === null) {
    throw new Error(RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404.message)
  }
  return tx
}

export async function fetchManyTransactionsById (idList: string[]): Promise<TransactionWithAddressAndPrices[]> {
  const tx = await prisma.transaction.findMany({
    where: {
      id: {
        in: idList
      }
    },
    include: includeAddressAndPrices
  })
  if (tx === null) {
    throw new Error(RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404.message)
  }
  return tx
}

export async function getTransactionNetworkId (tx: Transaction): Promise<number> {
  return (await fetchAddressById(tx.addressId)).networkId
}

export function base64HashToHex (base64Hash: string): string {
  return (
    atob(base64Hash)
      .split('')
      .reverse()
      .map(function (aChar) {
        return ('0' + aChar.charCodeAt(0).toString(16)).slice(-2)
      })
      .join('')
  )
}

interface CreateTransactionResult {
  tx: TransactionWithAddressAndPrices | undefined
  created: boolean
}

export async function upsertTransaction (
  transactionData: Prisma.TransactionUncheckedCreateInput
): Promise<CreateTransactionResult> {
  if (transactionData.amount === new Prisma.Decimal(0)) { // out transactions
    return { tx: undefined, created: false }
  }
  // we don't use `create` to ignore conflicts between the sync and the subscription
  const createdTx = await prisma.transaction.upsert({
    create: transactionData,
    include: includeAddressAndPrices,
    where: {
      Transaction_hash_addressId_unique_constraint: {
        hash: transactionData.hash,
        addressId: transactionData.addressId
      }
    },
    update: {
      confirmed: transactionData.confirmed,
      timestamp: transactionData.timestamp
    }
  })
  const created = createdTx.createdAt.getTime() === createdTx.updatedAt.getTime()
  if (created) await recordTxActivity([createdTx.addressId])
  const networkId = await getTransactionNetworkId(createdTx)
  const ts = flattenTimestamp(createdTx.timestamp)
  const allPrices = await fetchPricesForNetworkAndTimestamp(Number(networkId), ts, prisma, true)
  await connectTransactionToPrices(createdTx, prisma, allPrices)
  const txWithPaybuttonsAndPrices = await fetchTransactionWithPaybuttonsAndPrices(createdTx.id)
  await CacheSet.txCreation(txWithPaybuttonsAndPrices)
  return {
    tx: txWithPaybuttonsAndPrices,
    created
  }
}

function buildPriceTxConnectionInput (tx: Pick<Transaction, 'id'>, allPrices: AllPrices): Prisma.PricesOnTransactionsCreateManyInput[] {
  return [
    { transactionId: tx.id, priceId: allPrices.usd.id },
    { transactionId: tx.id, priceId: allPrices.cad.id }
  ]
}

// Txs whose link replacement failed. Their old links stay (rolled back) and may
// be for the wrong day, so neither the no-prices nor the irregular-count pass of
// connectAllTransactionsToPrices would find them. Kept in Redis because the
// failure can happen in the app process while the retry runs in the jobs process.
const PRICE_RELINK_PENDING_KEY = 'prices:relinkPending'

async function recordPendingRelinks (txIds: string[]): Promise<void> {
  try {
    await redis.sadd(PRICE_RELINK_PENDING_KEY, ...txIds)
  } catch (err: any) {
    console.error(`[PRICES] Failed to record ${txIds.length} txs for relinking: ${err.message as string}`)
  }
}

/** The fields connectTransactionsListToPrices needs from a tx. */
export type PriceLinkableTransaction = Pick<Transaction, 'id' | 'timestamp'> & {
  address: { networkId: number }
}

async function createPriceTxConnectionInChunks (
  client: Prisma.TransactionClient | typeof prisma,
  rows: Prisma.PricesOnTransactionsCreateManyInput[]
): Promise<void> {
  let pricesLinkedCount = 0
  console.log(`[PRICES] Inserting ${rows.length} price links...`)
  for (let i = 0; i < rows.length; i += PRICES_CONNECTION_BATCH_SIZE) {
    const slice = rows.slice(i, i + PRICES_CONNECTION_BATCH_SIZE)
    const result = await client.pricesOnTransactions.createMany({
      data: slice,
      skipDuplicates: true
    })
    pricesLinkedCount += result.count
  }
  console.log(`[PRICES] Inserted ${pricesLinkedCount} price links.`)
}

export async function connectTransactionToPrices (
  tx: Transaction,
  txClient: Prisma.TransactionClient,
  allPrices: AllPrices,
  disconnectBefore = true
): Promise<void> {
  if (disconnectBefore) {
    await txClient.pricesOnTransactions.deleteMany({ where: { transactionId: tx.id } })
  }
  const rows = buildPriceTxConnectionInput(tx, allPrices)
  await createPriceTxConnectionInChunks(txClient, rows)
}

/** Returns the complete (USD + CAD) stored prices for the given day timestamps, keyed by timestamp. */
async function fetchStoredPricesForNetworkAndTimestamps (
  networkId: number,
  timestamps: number[]
): Promise<Map<number, AllPrices>> {
  const prices = await prisma.price.findMany({
    where: {
      networkId,
      timestamp: { in: timestamps },
      quoteId: { in: [CAD_QUOTE_ID, USD_QUOTE_ID] }
    }
  })

  const grouped = new Map<number, Partial<AllPrices>>()
  for (const p of prices) {
    const g = grouped.get(p.timestamp) ?? {}
    if (p.quoteId === CAD_QUOTE_ID) g.cad = p
    else if (p.quoteId === USD_QUOTE_ID) g.usd = p
    grouped.set(p.timestamp, g)
  }

  const complete = new Map<number, AllPrices>()
  for (const [ts, g] of grouped) {
    if (g.cad !== undefined && g.usd !== undefined) {
      complete.set(ts, { cad: g.cad, usd: g.usd })
    }
  }
  return complete
}

export interface ConnectPricesOptions {
  // Set when every tx is known to have no price links yet (e.g. just inserted,
  // or selected by `prices: none`), so the per-chunk unlink can be skipped.
  skipUnlink?: boolean
}

/**
 * Link each tx to the USD and CAD prices of its day, replacing any existing links.
 * Writes in chunks of PRICES_CONNECTION_TX_CHUNK_SIZE txs, each in its own short
 * DB transaction: a chunk that fails is logged and skipped (its txs stay unpriced
 * for the next run to retry) instead of rolling back the whole list.
 * Returns the ids of the txs that were linked.
 */
export async function connectTransactionsListToPrices (
  txList: PriceLinkableTransaction[],
  { skipUnlink = false }: ConnectPricesOptions = {}
): Promise<string[]> {
  if (txList.length === 0) return []

  // collect UNIQUE (networkId, timestamp) pairs
  const networkIdToTimestamps = new Map<number, Set<number>>()
  for (const t of txList) {
    const networkId = t.address.networkId
    const ts = flattenTimestamp(t.timestamp)
    const set = networkIdToTimestamps.get(networkId) ?? new Set<number>()
    set.add(ts)
    networkIdToTimestamps.set(networkId, set)
  }

  // ---- efficient fetch ----
  const priceByNetworkTs = new Map<string, AllPrices>()

  for (const [networkId, timestamps] of networkIdToTimestamps.entries()) {
    const tsArray = [...timestamps]

    let storedPrices = await fetchStoredPricesForNetworkAndTimestamps(networkId, tsArray)

    // Days missing from the DB (of any age) are fetched from the price API, so
    // their txs get linked here instead of staying unpriced.
    const missingTs = tsArray.filter(ts => !storedPrices.has(ts))
    if (missingTs.length > 0) {
      console.log(`[PRICES] ${missingTs.length} days missing prices for networkId=${networkId}, fetching from price API...`)
      const fetchedTs = await fetchAndStoreMissingPrices(networkId, missingTs)
      if (fetchedTs.length > 0) {
        const fetchedPrices = await fetchStoredPricesForNetworkAndTimestamps(networkId, fetchedTs)
        storedPrices = new Map([...storedPrices, ...fetchedPrices])
      }
    }

    for (const ts of tsArray) {
      const allPrices = storedPrices.get(ts)
      if (allPrices === undefined) {
        console.warn(
          `[PRICES] No complete price data for networkId=${networkId} at ${moment.unix(ts).format(HUMAN_READABLE_DATE_FORMAT)} — skipping affected txs.`
        )
        continue
      }
      priceByNetworkTs.set(`${networkId}:${ts}`, allPrices)
    }
  }

  const txsToConnect: Array<{ id: string, rows: Prisma.PricesOnTransactionsCreateManyInput[] }> = []
  for (const t of txList) {
    const allPrices = priceByNetworkTs.get(`${t.address.networkId}:${flattenTimestamp(t.timestamp)}`)
    if (allPrices == null) {
      continue
    }
    txsToConnect.push({ id: t.id, rows: buildPriceTxConnectionInput(t, allPrices) })
  }
  const skippedNoPrice = txList.length - txsToConnect.length

  const linkedIds: string[] = []
  let failedChunks = 0
  for (let i = 0; i < txsToConnect.length; i += PRICES_CONNECTION_TX_CHUNK_SIZE) {
    const chunk = txsToConnect.slice(i, i + PRICES_CONNECTION_TX_CHUNK_SIZE)
    const ids = chunk.map(c => c.id)
    const rows = chunk.flatMap(c => c.rows)
    try {
      await prisma.$transaction(
        async (tx) => {
          if (!skipUnlink) {
            await tx.pricesOnTransactions.deleteMany({ where: { transactionId: { in: ids } } })
          }
          await createPriceTxConnectionInChunks(tx, rows)
        },
        { timeout: PRICES_CONNECTION_TIMEOUT }
      )
      linkedIds.push(...ids)
    } catch (err: any) {
      failedChunks++
      console.error(`[PRICES] Failed to link prices for a chunk of ${chunk.length} txs (first: ${ids[0]}): ${err.message as string}`)
      // Txs selected as unlinked are found again by the no-prices pass; replaced
      // links are not, so record them for connectAllTransactionsToPrices to retry.
      if (!skipUnlink) {
        await recordPendingRelinks(ids)
      }
    }
  }

  const failedTxs = txsToConnect.length - linkedIds.length
  if (skippedNoPrice > 0 || failedChunks > 0 || txList.length >= PRICES_CONNECTION_TX_CHUNK_SIZE) {
    console.log(
      `[PRICES] Linked ${linkedIds.length}/${txList.length} txs to prices` +
      (skippedNoPrice > 0 ? `, ${skippedNoPrice} skipped (no price data)` : '') +
      (failedChunks > 0 ? `, ${failedTxs} failed in ${failedChunks} chunks` : '') +
      '.'
    )
  }
  return linkedIds
}

let connectAllTransactionsToPricesRun: Promise<void> | undefined

// Addresses with newly priced txs whose cache invalidation hasn't succeeded yet.
// Once linked, those txs aren't found by later runs, so the addresses must not be
// dropped: they're retried on the next run. Kept in memory because this only runs
// in the jobs process and a failed invalidation usually means Redis is unreachable.
const addressesPendingCacheInvalidation = new Set<string>()

/**
 * Drop the payment, balance and dashboard caches of these addresses. Addresses
 * whose invalidation fails stay queued and are retried by the next call (or the
 * next connectAllTransactionsToPrices run in this process).
 */
export async function invalidateCachesForAddresses (addresses: string[]): Promise<void> {
  addresses.forEach(a => addressesPendingCacheInvalidation.add(a))
  await flushPendingCacheInvalidations()
}

async function flushPendingCacheInvalidations (): Promise<void> {
  if (addressesPendingCacheInvalidation.size === 0) return
  const addresses = [...addressesPendingCacheInvalidation]
  try {
    await CacheSet.addressesSynced(addresses)
    addresses.forEach(a => addressesPendingCacheInvalidation.delete(a))
    console.log(`[CACHE] Invalidated caches for ${addresses.length} addresses with newly priced txs.`)
  } catch (err: any) {
    console.error(`[PRICES] Failed to invalidate caches after linking prices, will retry on the next run: ${err.message as string}`)
  }
}

/**
 * Link every tx that has no prices, or an incomplete set, to its day's prices.
 * Unpriced txs are paged (UNPRICED_TXS_PAGE_SIZE at a time) rather than loaded
 * all at once. Runs from the startup sync job and from a repeating job; a call
 * made while a run is in progress in this process waits for that run instead of
 * starting another one.
 */
export async function connectAllTransactionsToPrices (): Promise<void> {
  if (connectAllTransactionsToPricesRun !== undefined) {
    console.log('[PRICES] Linking txs to prices is already running, waiting for it.')
    return await connectAllTransactionsToPricesRun
  }
  connectAllTransactionsToPricesRun = runConnectAllTransactionsToPrices()
  try {
    await connectAllTransactionsToPricesRun
  } finally {
    connectAllTransactionsToPricesRun = undefined
  }
}

async function runConnectAllTransactionsToPrices (): Promise<void> {
  console.log('[PRICES] Started connecting txs to prices.')
  // Addresses whose cached payments were built while these txs were unpriced
  // (and so left them out); their caches are dropped once the txs are linked.
  const trackLinked = (txs: Array<{ id: string, address: { address: string } }>, linkedIds: string[]): void => {
    const linked = new Set(linkedIds)
    for (const t of txs) {
      if (linked.has(t.id)) addressesPendingCacheInvalidation.add(t.address.address)
    }
  }
  const priceLinkableSelect = { id: true, timestamp: true, address: { select: { networkId: true, address: true } } } as const

  try {
    let found = 0
    let linked = 0
    let cursor: string | undefined
    while (true) {
      const page = await prisma.transaction.findMany({
        where: {
          prices: { none: {} },
          ...(cursor !== undefined ? { id: { gt: cursor } } : {})
        },
        orderBy: { id: 'asc' },
        take: UNPRICED_TXS_PAGE_SIZE,
        select: priceLinkableSelect
      })
      if (page.length === 0) break
      cursor = page[page.length - 1].id
      found += page.length
      const linkedIds = await connectTransactionsListToPrices(page, { skipUnlink: true })
      linked += linkedIds.length
      trackLinked(page, linkedIds)
      console.log(`[PRICES] Txs with no prices: ${linked}/${found} linked so far.`)
    }
    console.log(`[PRICES] Found ${found} txs with no prices, linked ${linked}.`)

    const wrongNumberOfPricesTxs = await fetchAllTransactionsWithIrregularPrices()
    console.log(`[PRICES] Found ${wrongNumberOfPricesTxs.length} txs with irregular prices.`)
    const relinkedIds = await connectTransactionsListToPrices(wrongNumberOfPricesTxs)
    trackLinked(wrongNumberOfPricesTxs, relinkedIds)

    // Txs whose link replacement failed earlier (possibly in another process).
    let pendingRelinked = 0
    try {
      const pendingIds = await redis.smembers(PRICE_RELINK_PENDING_KEY)
      if (pendingIds.length > 0) {
        const pendingTxs = await prisma.transaction.findMany({
          where: { id: { in: pendingIds } },
          select: priceLinkableSelect
        })
        const pendingLinkedIds = await connectTransactionsListToPrices(pendingTxs)
        trackLinked(pendingTxs, pendingLinkedIds)
        pendingRelinked = pendingLinkedIds.length
        // Done: relinked now, or deleted since. Failures stay recorded for the next run.
        const existing = new Set(pendingTxs.map(t => t.id))
        const relinked = new Set(pendingLinkedIds)
        const done = pendingIds.filter(id => relinked.has(id) || !existing.has(id))
        if (done.length > 0) {
          await redis.srem(PRICE_RELINK_PENDING_KEY, ...done)
        }
        console.log(`[PRICES] Relinked ${pendingRelinked}/${pendingIds.length} txs whose earlier link replacement failed.`)
      }
    } catch (err: any) {
      console.error(`[PRICES] Failed to relink txs recorded as pending: ${err.message as string}`)
    }

    console.log(
      `[PRICES] Finished connecting txs to prices (${linked} unpriced, ${relinkedIds.length} irregular ` +
      `and ${pendingRelinked} pending txs linked).`
    )
  } finally {
    // Also on failure: txs linked before it must still get their caches dropped.
    await flushPendingCacheInvalidations()
  }
}

/**
 * Link prices for the given addresses' txs that have none (or an incomplete set).
 * Catches txs from an on-demand sync (syncAndSubscribeAddresses) whose per-batch
 * price linking failed, without waiting for the repeating linking job.
 */
export async function connectTransactionsToPricesForAddresses (addressIds: string[]): Promise<void> {
  if (addressIds.length === 0) return
  const noPricesTxs = await prisma.transaction.findMany({
    where: {
      addressId: { in: addressIds },
      prices: { none: {} }
    },
    include: includeNetwork
  })
  const irregular = await prisma.pricesOnTransactions.groupBy({
    by: ['transactionId'],
    where: { transaction: { addressId: { in: addressIds } } },
    _count: { transactionId: true },
    having: { transactionId: { _count: { lt: N_OF_QUOTES } } }
  })
  const irregularTxs = irregular.length === 0
    ? []
    : await prisma.transaction.findMany({
      where: { id: { in: irregular.map(g => g.transactionId) } },
      include: includeNetwork
    })
  await connectTransactionsListToPrices([...noPricesTxs, ...irregularTxs])
}

// Prisma's error code for an interactive transaction that expired or was closed.
const PRISMA_TRANSACTION_API_ERROR = 'P2028'

const isTransactionTimeoutError = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === PRISMA_TRANSACTION_API_ERROR

/** Runs `fn`; if it fails with a transaction timeout, waits and runs it once more. */
export async function retryOnTransactionTimeout<T> (fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (!isTransactionTimeoutError(err)) throw err
    console.warn(`[TRANSACTIONS] DB transaction timed out, retrying once in ${SYNC_INSERT_RETRY_DELAY}ms...`)
    await new Promise(resolve => setTimeout(resolve, SYNC_INSERT_RETRY_DELAY))
    return await fn()
  }
}

interface ExistingTxSnapshot {
  confirmed: boolean
  timestamp: number
  orphaned: boolean
}

const txSnapshotKey = (hash: string, addressId: string): string =>
  `${hash}:${addressId}`

const rowNeedsUpsert = (
  row: Prisma.TransactionUncheckedCreateInput,
  existing: ExistingTxSnapshot
): boolean => {
  const confirmed = row.confirmed ?? false
  const timestamp = row.timestamp
  const orphaned = row.orphaned ?? false
  return (
    existing.confirmed !== confirmed ||
    existing.timestamp !== timestamp ||
    existing.orphaned !== orphaned
  )
}

/** Minimal row returned from bulk sync persist (no prices / paybuttons / cache). */
export interface SyncPersistedTransaction {
  id: string
  hash: string
  addressId: string
  amount: Prisma.Decimal
  timestamp: number
  confirmed: boolean
}

export interface CreateManyTransactionsSyncResult {
  insertedCount: number
  inserted: SyncPersistedTransaction[]
  // Addresses of pre-existing txs whose confirmed/timestamp/orphaned changed.
  updatedAddressIds: string[]
}

interface PersistManyTransactionRowsResult {
  inserted: SyncPersistedTransaction[]
  updated: SyncPersistedTransaction[]
  updatedCount: number
}

const syncPersistedTxSelect = {
  id: true,
  hash: true,
  addressId: true,
  amount: true,
  timestamp: true,
  confirmed: true
} as const

/**
 * Cheap dedupe before createManyTransactions: returns only new rows or rows
 * whose confirmed, timestamp, or orphaned may have changed.
 */
export async function filterRowsNeedingCreateMany (
  transactionsData: Prisma.TransactionUncheckedCreateInput[]
): Promise<Prisma.TransactionUncheckedCreateInput[]> {
  if (transactionsData.length === 0) {
    return []
  }

  const existingTxs = await prisma.transaction.findMany({
    where: {
      OR: transactionsData.map(tx => ({
        hash: tx.hash,
        addressId: tx.addressId
      }))
    },
    select: {
      hash: true,
      addressId: true,
      confirmed: true,
      timestamp: true,
      orphaned: true
    }
  })

  const existingMap = new Map<string, ExistingTxSnapshot>()
  for (const tx of existingTxs) {
    existingMap.set(txSnapshotKey(tx.hash, tx.addressId), tx)
  }

  return transactionsData.filter(row => {
    const existing = existingMap.get(txSnapshotKey(row.hash, row.addressId))
    if (existing == null) {
      return true
    }
    return rowNeedsUpsert(row, existing)
  })
}

/**
 * Insert or update transactions and inputs only (no prices, cache, or heavy includes).
 * Existing-row lookup and updates stay outside the interactive transaction so a
 * pool connection is not held for the full classify + per-row update window.
 */
async function persistManyTransactionRows (
  transactionsData: Prisma.TransactionUncheckedCreateInput[]
): Promise<PersistManyTransactionRowsResult> {
  const flatTxData = transactionsData.map(tx => ({
    hash: tx.hash,
    amount: tx.amount,
    timestamp: tx.timestamp,
    addressId: tx.addressId,
    confirmed: tx.confirmed ?? false,
    isPayment: tx.amount > 0,
    opReturn: tx.opReturn ?? '',
    orphaned: false
  }))

  const txInputs = transactionsData.map((tx) => {
    const inputs = (tx.inputs != null) && 'create' in tx.inputs ? tx.inputs.create : []
    return {
      hash: tx.hash,
      addressId: tx.addressId,
      inputs: Array.isArray(inputs) ? inputs : []
    }
  })

  const existingTxs = await prisma.transaction.findMany({
    where: {
      OR: flatTxData.map(row => ({
        hash: row.hash,
        addressId: row.addressId
      }))
    },
    select: {
      id: true,
      hash: true,
      addressId: true,
      confirmed: true,
      timestamp: true,
      orphaned: true
    }
  })

  const existingMap = new Map<string, typeof existingTxs[0]>()
  for (const row of existingTxs) {
    existingMap.set(`${row.hash}:${row.addressId}`, row)
  }

  const newTxs: typeof flatTxData = []
  const newTxsInputs: typeof txInputs = []
  const toUpdate: Array<{
    id: string
    confirmed: boolean
    timestamp: number
    orphaned: boolean
  }> = []

  for (let i = 0; i < flatTxData.length; i++) {
    const row = flatTxData[i]
    const key = `${row.hash}:${row.addressId}`
    const existing = existingMap.get(key)

    if (existing != null) {
      const confirmedChanged = existing.confirmed !== row.confirmed
      const timestampChanged = existing.timestamp !== row.timestamp
      const orphanedChanged = existing.orphaned !== row.orphaned

      if (confirmedChanged || timestampChanged || orphanedChanged) {
        toUpdate.push({
          id: existing.id,
          confirmed: row.confirmed,
          timestamp: row.timestamp,
          orphaned: row.orphaned
        })
      }
    } else {
      newTxs.push(row)
      newTxsInputs.push(txInputs[i])
    }
  }

  const inserted: SyncPersistedTransaction[] = []
  const updated: SyncPersistedTransaction[] = []
  let updatedCount = 0

  if (newTxs.length > 0) {
    // Ids are generated here so only rows this call created are reported as
    // inserted: if a concurrent sync inserted the same (hash, addressId) first,
    // skipDuplicates keeps that row (with its own id) and it is left out, so its
    // price linking, seed-file append and triggers aren't run twice.
    const newTxsWithIds = newTxs.map(row => ({ ...row, id: uuidv4() }))
    const newIds = newTxsWithIds.map(row => row.id)
    // Retried once if the DB transaction times out (e.g. MySQL briefly stalled
    // under load), instead of dropping the whole batch. Safe to repeat: the
    // timed-out attempt was rolled back and the inserts skip duplicates.
    const createdTxs = await retryOnTransactionTimeout(async () => await prisma.$transaction(
      async (tx) => {
        await tx.transaction.createMany({
          data: newTxsWithIds,
          skipDuplicates: true
        })

        const createdTxs = await tx.transaction.findMany({
          where: { id: { in: newIds } },
          select: syncPersistedTxSelect
        })

        const txMap = new Map<string, { tx: typeof createdTxs[0], inputs: typeof txInputs[0]['inputs'] }>()
        for (let i = 0; i < newTxs.length; i++) {
          const row = newTxs[i]
          const created = createdTxs.find(
            ct => ct.hash === row.hash && ct.addressId === row.addressId
          )
          if (created != null) {
            txMap.set(`${row.hash}:${row.addressId}`, {
              tx: created,
              inputs: newTxsInputs[i].inputs
            })
          }
        }

        const allInputs: Array<{
          transactionId: string
          address: string
          index: number
          amount: Prisma.Decimal
        }> = []
        for (const [, { tx: createdTx, inputs }] of txMap) {
          for (const input of inputs) {
            allInputs.push({
              transactionId: createdTx.id,
              address: input.address,
              index: input.index,
              amount: input.amount instanceof Prisma.Decimal
                ? input.amount
                : new Prisma.Decimal(input.amount as string | number)
            })
          }
        }

        if (allInputs.length > 0) {
          await tx.transactionInput.createMany({
            data: allInputs,
            skipDuplicates: true
          })
        }

        return createdTxs
      },
      {
        timeout: UPSERT_TRANSACTION_PRICES_ON_DB_TIMEOUT
      }
    ))
    inserted.push(...createdTxs)
  }

  if (toUpdate.length > 0) {
    const updateGroups = new Map<string, {
      confirmed: boolean
      timestamp: number
      orphaned: boolean
      ids: string[]
    }>()
    for (const update of toUpdate) {
      const key = `${String(update.confirmed)}:${update.timestamp}:${String(update.orphaned)}`
      const group = updateGroups.get(key)
      if (group == null) {
        updateGroups.set(key, {
          confirmed: update.confirmed,
          timestamp: update.timestamp,
          orphaned: update.orphaned,
          ids: [update.id]
        })
      } else {
        group.ids.push(update.id)
      }
    }

    for (const group of updateGroups.values()) {
      await prisma.transaction.updateMany({
        where: { id: { in: group.ids } },
        data: {
          confirmed: group.confirmed,
          timestamp: group.timestamp,
          orphaned: group.orphaned
        }
      })
    }

    const updatedTxs = await prisma.transaction.findMany({
      where: { id: { in: toUpdate.map(u => u.id) } },
      select: syncPersistedTxSelect
    })
    updated.push(...updatedTxs)
    updatedCount = updatedTxs.length
  }

  await recordTxActivity(inserted.map(t => t.addressId))
  return { inserted, updated, updatedCount }
}

// A new tx is activity on its address (keeps it from expiring). Not fatal: the
// txs are already persisted.
async function recordTxActivity (addressIds: string[]): Promise<void> {
  try {
    await touchAddressActivity(addressIds)
  } catch (err: any) {
    console.error(`[ADDRESS EXPIRY]: Failed to record tx activity for ${addressIds.length} addresses: ${err.message as string}`)
  }
}

/**
 * Bulk sync path: persist txs + inputs only. The caller (commitTransactionsBatch)
 * links prices per batch; the Redis cache is invalidated after the sync, and
 * connectAllTransactionsToPrices retries any txs left unpriced.
 */
export async function createManyTransactionsForSync (
  transactionsData: Prisma.TransactionUncheckedCreateInput[]
): Promise<CreateManyTransactionsSyncResult> {
  if (transactionsData.length === 0) {
    return { insertedCount: 0, inserted: [], updatedAddressIds: [] }
  }

  const { inserted, updated } = await persistManyTransactionRows(transactionsData)
  return {
    insertedCount: inserted.length,
    inserted,
    updatedAddressIds: [...new Set(updated.map(t => t.addressId))]
  }
}

export async function createManyTransactions (
  transactionsData: Prisma.TransactionUncheckedCreateInput[]
): Promise<TransactionWithAddressAndPrices[]> {
  if (transactionsData.length === 0) {
    return []
  }

  const { inserted, updated } = await persistManyTransactionRows(transactionsData)
  const persistedIds = [
    ...inserted.map(t => t.id),
    ...updated.map(t => t.id)
  ]

  if (persistedIds.length === 0) {
    return []
  }

  const persistedTransactions = await prisma.transaction.findMany({
    where: {
      id: { in: persistedIds }
    },
    include: includeNetwork
  })

  await connectTransactionsListToPrices(persistedTransactions)
  const txsWithPaybuttonsAndPrices = await fetchTransactionsWithPaybuttonsAndPricesForIdList(
    persistedIds
  )

  void CacheSet.txsCreation(txsWithPaybuttonsAndPrices)

  return txsWithPaybuttonsAndPrices
}

export async function fetchUnconfirmedTransactions (hash: string): Promise<TransactionWithAddressAndPrices[]> {
  return await prisma.transaction.findMany({
    where: {
      hash,
      confirmed: false
    },
    include: includeAddressAndPrices
  })
}

export async function deleteTransactions (transactions: TransactionWithAddressAndPrices[]): Promise<void> {
  await Promise.all(transactions.map(
    async transaction => await prisma.transaction.delete({
      where: {
        id: transaction.id
      }
    })
  ))
}

export async function markTransactionsOrphaned (hash: string): Promise<void> {
  await prisma.transaction.updateMany({
    where: {
      hash
    },
    data: {
      orphaned: true
    }
  })
}

export async function fetchAllTransactionsWithIrregularPrices (): Promise<Array<PriceLinkableTransaction & { address: { address: string } }>> {
  const grouped = await prisma.pricesOnTransactions.groupBy({
    by: ['transactionId'],
    _count: { transactionId: true },
    having: { transactionId: { _count: { equals: 1 } } }
  })

  const ids = grouped.map(g => g.transactionId)

  return await prisma.transaction.findMany({
    where: { id: { in: ids } },
    select: { id: true, timestamp: true, address: { select: { networkId: true, address: true } } }
  })
}

export async function fetchTransactionsByPaybuttonId (paybuttonId: string, networkIds?: number[]): Promise<TransactionsWithPaybuttonsAndPrices[]> {
  const addressIdList = await fetchAddressesByPaybuttonId(paybuttonId)
  const transactions = await fetchTransactionsByAddressList(addressIdList, networkIds)

  return transactions
}

export async function fetchTransactionsByPaybuttonIdWithPagination (
  paybuttonId: string,
  page: number,
  pageSize: number,
  orderDesc: boolean,
  orderBy?: string,
  networkIds?: number[],
  includeInputs = false
): Promise<TransactionsWithPaybuttonsAndPrices[]> {
  const addressIdList = await fetchAddressesByPaybuttonId(paybuttonId)
  const transactions = await fetchTransactionsByAddressListWithPagination(
    addressIdList,
    page,
    pageSize,
    orderBy,
    orderDesc,
    networkIds,
    includeInputs
  )

  return transactions
}

export const getTransactionValueInCurrency = (transaction: TransactionWithAddressAndPrices, currency: SupportedQuotesType): number => {
  const {
    prices,
    amount,
    hash,
    timestamp
  } = transaction

  const result: Record<SupportedQuotesType, number> = {
    usd: 0,
    cad: 0
  }

  if (prices.length !== N_OF_QUOTES) {
    throw new Error(`${RESPONSE_MESSAGES.MISSING_PRICE_FOR_TRANSACTION_400.message}, txId ${hash}, at ${timestamp}`)
  }

  for (const p of prices) {
    if (p.price.quoteId === USD_QUOTE_ID) {
      result.usd = p.price.value.times(amount).toNumber()
    }
    if (p.price.quoteId === CAD_QUOTE_ID) {
      result.cad = p.price.value.times(amount).toNumber()
    }
  }

  return result[currency]
}

export async function getOldestPositiveTxForUser (userId: string): Promise<Transaction | null> {
  return await prisma.transaction.findFirst({
    where: {
      address: {
        userProfiles: {
          some: {
            userId
          }
        }
      },
      amount: {
        gt: 0
      }
    },
    orderBy: { timestamp: 'asc' }
  })
}

export async function getPaymentsByUserIdOrderedByButtonName (
  userId: string,
  page: number,
  pageSize: number,
  orderDesc = true,
  buttonIds?: string[]
): Promise<Payment[]> {
  const offset = page * pageSize
  const order = orderDesc ? Prisma.sql`DESC` : Prisma.sql`ASC`
  const buttonFilter = Array.isArray(buttonIds) && buttonIds.length > 0
    ? Prisma.sql`AND p.id IN (${Prisma.join(buttonIds)})`
    : Prisma.empty

  const transactions: any = await prisma.$queryRaw`
    SELECT 
      t.*, 
      p.id AS paybuttonId, 
      p.name AS paybuttonName, 
      p.providerUserId AS paybuttonProviderUserId,
      a.networkId as networkId,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'priceId', pb.id,
          'priceValue', pb.value,
          'quoteId', pb.quoteId
        )
      ) AS prices,
      JSON_ARRAYAGG(
        IF(i.id IS NOT NULL,
          JSON_OBJECT(
            'id', i.id,
            'invoiceNumber', i.invoiceNumber,
            'userId', i.userId,
            'amount', i.amount,
            'description', i.description,
            'recipientName', i.recipientName,
            'recipientAddress', i.recipientAddress,
            'customerName', i.customerName,
            'customerAddress', i.customerAddress,
            'createdAt', i.createdAt,
            'updatedAt', i.updatedAt
          ),
          NULL
        )
      ) AS invoices
    FROM \`Transaction\` t
    INNER JOIN \`Address\` a ON t.\`addressId\` = a.\`id\`
    INNER JOIN \`AddressesOnButtons\` ab ON a.\`id\` = ab.\`addressId\`
    INNER JOIN \`Paybutton\` p ON ab.\`paybuttonId\` = p.\`id\`
    LEFT JOIN \`PricesOnTransactions\` pt ON t.\`id\` = pt.\`transactionId\`
    LEFT JOIN \`Price\` pb ON pt.\`priceId\` = pb.\`id\`
    LEFT JOIN \`Invoice\` i ON i.\`transactionId\` = t.\`id\`
    WHERE t.\`isPayment\` = TRUE
    AND EXISTS (
      SELECT 1
      FROM \`AddressesOnUserProfiles\` au
      WHERE au.\`addressId\` = a.\`id\`
        AND au.\`userId\` = ${userId}
    )
    AND p.\`providerUserId\` = ${userId}
    ${buttonFilter}
    GROUP BY t.id, p.id
    ORDER BY p.\`name\` ${order}
    LIMIT ${pageSize}
    OFFSET ${offset};
  `

  const payments: Payment[] = []

  transactions.forEach((tx: any) => {
    const ret: QuoteValues = {
      usd: new Prisma.Decimal(0),
      cad: new Prisma.Decimal(0)
    }
    for (const p of JSON.parse(tx.prices)) {
      if (p.quoteId === USD_QUOTE_ID) {
        ret.usd = ret.usd.plus(p.priceValue * tx.amount)
      }
      if (p.quoteId === CAD_QUOTE_ID) {
        ret.cad = ret.cad.plus(p.priceValue * tx.amount)
      }
    }
    const buttonDisplayDataList: ButtonDisplayData[] = []
    buttonDisplayDataList.push({
      name: tx.paybuttonName,
      id: tx.paybuttonId,
      providerUserId: tx.paybuttonProviderUserId
    })
    let invoices = null
    if (JSON.parse(tx.invoices).length > 0) {
      invoices = JSON.parse(tx.invoices).filter((invoice: any) => {
        return invoice !== null && invoice.userId === userId
      })
    }

    if (tx.amount > 0) {
      payments.push({
        id: tx.id,
        amount: tx.amount,
        timestamp: tx.timestamp,
        values: ret,
        networkId: tx.networkId,
        hash: tx.hash,
        buttonDisplayDataList,
        invoices
      })
    }
  })

  return payments
}

export async function fetchAllPaymentsByUserIdWithPagination (
  userId: string,
  page: number,
  pageSize: number,
  timezone: string,
  orderBy?: string,
  orderDesc = true,
  buttonIds?: string[],
  years?: string[],
  startDate?: string,
  endDate?: string,
  includeInputs = false
): Promise<Payment[]> {
  if (orderBy === 'buttonDisplayDataList') {
    return await getPaymentsByUserIdOrderedByButtonName(
      userId, page, pageSize, orderDesc, buttonIds
    )
  }
  const orderByQuery = paymentOrderBy(orderBy, orderDesc)

  const userAddresses = await prisma.address.findMany({
    where: { userProfiles: { some: { userId } } },
    select: { id: true }
  })
  const userAddressIds = userAddresses.map(a => a.id)

  const where: Prisma.TransactionWhereInput = {
    addressId: { in: userAddressIds },
    isPayment: true
  }

  if (startDate !== undefined && endDate !== undefined && startDate !== '' && endDate !== '') {
    Object.assign(where, getDateRangeFilter(new Date(startDate), new Date(endDate), timezone))
  } else if (years !== undefined && years.length > 0) {
    where.OR = getYearFilters(years, timezone)
  }

  if ((buttonIds !== undefined) && buttonIds.length > 0) {
    const buttonAddresses = await prisma.address.findMany({
      where: {
        paybuttons: { some: { paybutton: { id: { in: buttonIds } } } },
        id: { in: userAddressIds }
      },
      select: { id: true }
    })
    where.addressId = { in: buttonAddresses.map(a => a.id) }
  }

  // Build include conditionally - exclude inputs by default unless explicitly requested
  const include = includeInputs
    ? includePaybuttonsAndPricesAndInvoices
    : (() => {
        const { inputs, ...rest } = includePaybuttonsAndPricesAndInvoices
        return rest
      })()

  const transactions = await prisma.transaction.findMany({
    where,
    include,
    orderBy: orderByQuery,
    skip: page * Number(pageSize),
    take: Number(pageSize)
  })

  const transformedData: Payment[] = []
  for (let index = 0; index < transactions.length; index++) {
    const tx = transactions[index]
    if (Number(tx.amount) > 0) {
      const payment = generatePaymentFromTxWithInvoices(tx as unknown as TransactionWithAddressAndPricesAndInvoices, userId)
      transformedData.push(payment)
    }
  }
  return transformedData
}

const buildDateRange = (
  startDate: Date,
  endDate: Date,
  timezone?: string
): { gte: number, lte: number } => {
  let start: number
  let end: number

  if (timezone !== undefined && timezone !== null && timezone !== '') {
    const startMoment = moment.tz(
      {
        year: startDate.getUTCFullYear(),
        month: startDate.getUTCMonth(),
        day: startDate.getUTCDate()
      },
      timezone
    ).startOf('day')

    const endMoment = moment.tz(
      {
        year: endDate.getUTCFullYear(),
        month: endDate.getUTCMonth(),
        day: endDate.getUTCDate()
      },
      timezone
    ).endOf('day')

    start = startMoment.unix()
    end = endMoment.unix()
  } else {
    start = moment.utc(startDate).unix()
    end = moment.utc(endDate).endOf('day').unix()
  }

  return {
    gte: Math.round(start),
    lte: Math.round(end)
  }
}

const getDateRangeFilter = (
  startDate: Date,
  endDate: Date,
  timezone?: string
): Prisma.TransactionWhereInput => ({
  timestamp: buildDateRange(startDate, endDate, timezone)
})

const getYearFilters = (
  years: string[],
  timezone?: string
): Prisma.TransactionWhereInput[] => {
  return years.map((year) => {
    const y = Number(year)
    const startDate = new Date(Date.UTC(y, 0, 1, 0, 0, 0)) // Jan 1, 00:00:00
    const endDate = new Date(Date.UTC(y, 11, 31, 23, 59, 59)) // Dec 31, 23:59:59
    return {
      timestamp: buildDateRange(startDate, endDate, timezone)
    }
  })
}

export async function fetchAllPaymentsByUserId (
  userId: string,
  networkIds?: number[],
  buttonIds?: string[],
  years?: string[],
  startDate?: string,
  endDate?: string,
  timezone?: string
): Promise<TransactionsWithPaybuttonsAndPrices[]> {
  const where: Prisma.TransactionWhereInput = {
    address: {
      userProfiles: {
        some: { userId }
      },
      networkId: {
        in: networkIds ?? Object.values(NETWORK_IDS)
      }
    },
    isPayment: true
  }

  if (buttonIds !== undefined && buttonIds.length > 0) {
    where.address!.paybuttons = {
      some: {
        paybutton: {
          id: { in: buttonIds }
        }
      }
    }
  }

  if (startDate !== undefined && endDate !== undefined && startDate !== '' && endDate !== '') {
    Object.assign(where, getDateRangeFilter(new Date(startDate), new Date(endDate), timezone))
  } else if (years !== undefined && years.length > 0) {
    where.OR = getYearFilters(years, timezone)
  }

  return await prisma.transaction.findMany({
    where,
    include: includePaybuttonsAndPrices,
    orderBy: {
      timestamp: 'asc'
    }
  })
}

export async function fetchTxCountByPaybuttonId (paybuttonId: string): Promise<number> {
  const addressIdList = await fetchAddressesByPaybuttonId(paybuttonId)

  return await prisma.transaction.count({
    where: {
      addressId: {
        in: addressIdList
      }
    }
  })
}

export const getFilteredTransactionCount = async (
  userId: string,
  buttonIds?: string[],
  years?: string[],
  timezone?: string,
  startDate?: string,
  endDate?: string
): Promise<number> => {
  const userAddresses = await prisma.address.findMany({
    where: { userProfiles: { some: { userId } } },
    select: { id: true }
  })
  const userAddressIds = userAddresses.map(a => a.id)

  const where: Prisma.TransactionWhereInput = {
    addressId: { in: userAddressIds },
    isPayment: true
  }
  if (buttonIds !== undefined && buttonIds.length > 0) {
    const buttonAddresses = await prisma.address.findMany({
      where: {
        paybuttons: { some: { paybutton: { id: { in: buttonIds } } } },
        id: { in: userAddressIds }
      },
      select: { id: true }
    })
    where.addressId = { in: buttonAddresses.map(a => a.id) }
  }

  if (startDate !== undefined && endDate !== undefined && startDate !== '' && endDate !== '') {
    Object.assign(where, getDateRangeFilter(new Date(startDate), new Date(endDate), timezone))
  } else if (years !== undefined && years.length > 0) {
    where.OR = getYearFilters(years, timezone)
  }

  return await prisma.transaction.count({ where })
}

export const fetchDistinctPaymentYearsByUser = async (userId: string): Promise<number[]> => {
  const years = await prisma.$queryRaw<Array<{ year: number }>>`
    SELECT DISTINCT YEAR(FROM_UNIXTIME(t.timestamp)) AS year
    FROM Transaction t
    JOIN Address a ON a.id = t.addressId
    JOIN AddressesOnUserProfiles ap ON ap.addressId = a.id
    WHERE ap.userId = ${userId}
    ORDER BY year ASC
  `

  return years.map(y => y.year)
}
