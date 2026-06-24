import prisma from 'prisma-local/clientInstance'
import { Prisma, Transaction } from '@prisma/client'
import { RESPONSE_MESSAGES, USD_QUOTE_ID, CAD_QUOTE_ID, N_OF_QUOTES, UPSERT_TRANSACTION_PRICES_ON_DB_TIMEOUT, SupportedQuotesType, NETWORK_IDS, PRICES_CONNECTION_BATCH_SIZE, PRICES_CONNECTION_TIMEOUT, HUMAN_READABLE_DATE_FORMAT } from 'constants/index'
import { fetchAddressBySubstring, fetchAddressById, fetchAddressesByPaybuttonId, addressExists } from 'services/addressService'
import { AllPrices, QuoteValues, fetchPricesForNetworkAndTimestamp, flattenTimestamp } from 'services/priceService'
import _ from 'lodash'
import { CacheSet } from 'redis/index'
import { SimplifiedTransaction } from 'ws-service/types'
import { OpReturnData, parseAddress } from 'utils/validators'
import { generatePaymentFromTxWithInvoices } from 'redis/paymentCache'
import { ButtonDisplayData, Payment } from 'redis/types'
import moment from 'moment-timezone'

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

const transactionWithNetwork = Prisma.validator<Prisma.TransactionDefaultArgs>()(
  { include: includeNetwork }
)

type TransactionWithNetwork = Prisma.TransactionGetPayload<typeof transactionWithNetwork>

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

export async function fetchTransactionsByAddressListWithPagination (
  addressIdList: string[],
  page: number,
  pageSize: number,
  orderBy?: string,
  orderDesc = true,
  networkIdsListFilter?: number[],
  includeInputs = false
): Promise<TransactionsWithPaybuttonsAndPrices[]> {
  const orderDescString: Prisma.SortOrder = orderDesc ? 'desc' : 'asc'

  // Get query for orderBy that works with nested properties (e.g. `address.networkId`)
  let orderByQuery
  if (orderBy !== undefined && orderBy !== '') {
    if (orderBy.includes('.')) {
      const [relation, property] = orderBy.split('.')
      orderByQuery = {
        [relation]: {
          [property]: orderDescString
        }
      }
    } else {
      orderByQuery = {
        [orderBy]: orderDescString
      }
    }
  } else {
    // Default orderBy
    orderByQuery = {
      timestamp: orderDescString
    }
  }

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

export async function * generateTransactionsWithPaybuttonsAndPricesForAddress (addressId: string, pageSize = 5000): AsyncGenerator<TransactionsWithPaybuttonsAndPrices[]> {
  let page = 0

  while (true) {
    const txs = await prisma.transaction.findMany({
      where: {
        addressId
      },
      include: includePaybuttonsAndPrices,
      orderBy: {
        timestamp: 'asc'
      },
      skip: page * pageSize,
      take: pageSize
    })
    if (txs.length === 0) break
    yield txs
    page++
  }
}

export async function fetchPaginatedAddressTransactions (addressString: string, page: number, pageSize: number, orderBy?: string, orderDesc = true): Promise<TransactionWithAddressAndPrices[]> {
  const orderDescString: Prisma.SortOrder = orderDesc ? 'desc' : 'asc'

  // Get query for orderBy that works with nested properties (e.g. `address.networkId`)
  let orderByQuery
  if (orderBy !== undefined && orderBy !== '') {
    if (orderBy.includes('.')) {
      const [relation, property] = orderBy.split('.')
      orderByQuery = {
        [relation]: {
          [property]: orderDescString
        }
      }
    } else {
      orderByQuery = {
        [orderBy]: orderDescString
      }
    }
  } else {
    // Default orderBy
    orderByQuery = {
      timestamp: orderDescString
    }
  }
  const parsedAddress = parseAddress(addressString)
  await addressExists(parsedAddress, true)
  const txs = await prisma.transaction.findMany({
    where: {
      address: {
        address: parsedAddress
      }
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

function buildPriceTxConnectionInput (tx: Transaction, allPrices: AllPrices): Prisma.PricesOnTransactionsCreateManyInput[] {
  return [
    { transactionId: tx.id, priceId: allPrices.usd.id },
    { transactionId: tx.id, priceId: allPrices.cad.id }
  ]
}

async function deletePriceTxConnectionsInChunks (
  client: Prisma.TransactionClient,
  transactionIds: string[]
): Promise<void> {
  let pricesUnlinkedCount = 0
  console.log(
    `[PRICES] Disconnecting existing price links for ${transactionIds.length} txs...`
  )
  for (let i = 0; i < transactionIds.length; i += PRICES_CONNECTION_BATCH_SIZE) {
    const slice = transactionIds.slice(i, i + PRICES_CONNECTION_BATCH_SIZE)
    const result = await client.pricesOnTransactions.deleteMany({
      where: { transactionId: { in: slice } }
    })
    pricesUnlinkedCount += result.count
  }
  console.log(`[PRICES] Disconnected ${pricesUnlinkedCount} price links.`)
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

export async function connectTransactionsListToPrices (
  txList: TransactionWithNetwork[]
): Promise<void> {
  if (txList.length === 0) return

  console.log(`[PRICES] Preparing to connect ${txList.length} txs to prices...`)

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
  let pairs = 0

  for (const [networkId, timestamps] of networkIdToTimestamps.entries()) {
    const tsArray = [...timestamps]
    pairs += tsArray.length

    // Bulk fetch all (CAD + USD) for this networkId
    const prices = await prisma.price.findMany({
      where: {
        networkId,
        timestamp: { in: tsArray },
        quoteId: { in: [CAD_QUOTE_ID, USD_QUOTE_ID] }
      }
    })

    // Group prices by timestamp
    const grouped = new Map<number, Partial<AllPrices>>()
    for (const p of prices) {
      const g = grouped.get(p.timestamp) ?? {}
      if (p.quoteId === CAD_QUOTE_ID) g.cad = p
      else if (p.quoteId === USD_QUOTE_ID) g.usd = p
      grouped.set(p.timestamp, g)
    }

    // Throw on missing price pairs
    for (const ts of tsArray) {
      const allPrices = grouped.get(ts)
      const formattedDate = moment.unix(ts).format(HUMAN_READABLE_DATE_FORMAT)

      if (allPrices == null) {
        throw new Error(
          `[PRICES] No price record found for networkId=${networkId} at ${formattedDate}.`
        )
      }

      if ((allPrices.cad == null) || (allPrices.usd == null)) {
        throw new Error(
          `[PRICES] Incomplete price data for networkId=${networkId} at ${formattedDate}. Partial data: ${JSON.stringify(allPrices, null, 2)}`
        )
      }

      priceByNetworkTs.set(`${networkId}:${ts}`, allPrices as AllPrices)
    }
  }

  console.log(`[PRICES] Loaded prices for ${pairs} (network,timestamp) pairs.`)

  // Build all join rows (2 per tx: USD + CAD)
  const rows: Prisma.PricesOnTransactionsCreateManyInput[] = []
  for (const t of txList) {
    const ts = flattenTimestamp(t.timestamp)
    const allPrices = priceByNetworkTs.get(`${t.address.networkId}:${ts}`)
    if (allPrices == null) {
      throw new Error(`[PRICES] Missing price pair for networkId ${t.address.networkId} at ${moment.unix(ts).format(HUMAN_READABLE_DATE_FORMAT)}.`)
    }
    rows.push(...buildPriceTxConnectionInput(t, allPrices))
  }
  console.log(`[PRICES] Built ${rows.length} price links (2 per tx).`)

  await prisma.$transaction(
    async (tx) => {
      await deletePriceTxConnectionsInChunks(tx, txList.map((t) => t.id))
      await createPriceTxConnectionInChunks(tx, rows)
    },
    { timeout: PRICES_CONNECTION_TIMEOUT }
  )
}

export async function connectAllTransactionsToPrices (): Promise<void> {
  console.log('[PRICES] Started connecting txs to prices.')
  const noPricesTxs = await fetchAllTransactionsWithNoPrices()
  console.log(`[PRICES] Found ${noPricesTxs.length} txs with no prices.`)
  const wrongNumberOfPricesTxs = await fetchAllTransactionsWithIrregularPrices()
  console.log(`[PRICES] Found ${wrongNumberOfPricesTxs.length} txs with irregular prices.`)
  const txs = [
    ...noPricesTxs,
    ...wrongNumberOfPricesTxs
  ]
  console.log('[PRICES] Connecting txs to prices...')
  void await connectTransactionsListToPrices(txs)
  console.log('[PRICES] Finished connecting txs to prices.')
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

  const inserted: SyncPersistedTransaction[] = []
  const updated: SyncPersistedTransaction[] = []
  let updatedCount = 0

  await prisma.$transaction(
    async (tx) => {
      const existingTxs = await tx.transaction.findMany({
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

      if (newTxs.length > 0) {
        await tx.transaction.createMany({
          data: newTxs,
          skipDuplicates: true
        })

        const createdTxs = await tx.transaction.findMany({
          where: {
            OR: newTxs.map(row => ({
              hash: row.hash,
              addressId: row.addressId
            }))
          },
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

        for (const createdTx of createdTxs) {
          inserted.push(createdTx)
        }
      }

      if (toUpdate.length > 0) {
        await Promise.all(
          toUpdate.map(async update =>
            await tx.transaction.update({
              where: { id: update.id },
              data: {
                confirmed: update.confirmed,
                timestamp: update.timestamp,
                orphaned: update.orphaned
              }
            })
          )
        )
        const updatedTxs = await tx.transaction.findMany({
          where: { id: { in: toUpdate.map(u => u.id) } },
          select: syncPersistedTxSelect
        })
        updated.push(...updatedTxs)
        updatedCount = updatedTxs.length
      }
    },
    {
      timeout: UPSERT_TRANSACTION_PRICES_ON_DB_TIMEOUT
    }
  )

  return { inserted, updated, updatedCount }
}

/**
 * Bulk sync path: persist txs + inputs only. Prices, Redis cache, and paybutton
 * graphs are deferred to connectAllTransactionsToPrices after the sync job.
 */
export async function createManyTransactionsForSync (
  transactionsData: Prisma.TransactionUncheckedCreateInput[]
): Promise<CreateManyTransactionsSyncResult> {
  if (transactionsData.length === 0) {
    return { insertedCount: 0, inserted: [] }
  }

  const { inserted } = await persistManyTransactionRows(transactionsData)
  return {
    insertedCount: inserted.length,
    inserted
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

async function fetchAllTransactionsWithNoPrices (): Promise<TransactionWithNetwork[]> {
  const x = await prisma.transaction.findMany({
    where: {
      prices: {
        none: {}
      }
    },
    include: includeNetwork
  })
  return x
}

export async function fetchAllTransactionsWithIrregularPrices (): Promise<TransactionWithNetwork[]> {
  const grouped = await prisma.pricesOnTransactions.groupBy({
    by: ['transactionId'],
    _count: { transactionId: true },
    having: { transactionId: { _count: { equals: 1 } } }
  })

  const ids = grouped.map(g => g.transactionId)

  return await prisma.transaction.findMany({
    where: { id: { in: ids } },
    include: includeNetwork
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
  const orderDescString: Prisma.SortOrder = orderDesc ? 'desc' : 'asc'

  if (orderBy === 'buttonDisplayDataList') {
    return await getPaymentsByUserIdOrderedByButtonName(
      userId, page, pageSize, orderDesc, buttonIds
    )
  }
  // Get query for orderBy that works with nested properties (e.g. `address.networkId`)
  let orderByQuery
  if (orderBy !== undefined && orderBy !== '') {
    if (orderBy === 'values') {
      orderByQuery = {
        amount: orderDescString
      }
    } else if (orderBy === 'networkId') {
      orderByQuery = {
        address: {
          networkId: orderDescString
        }
      }
    } else {
      orderByQuery = {
        [orderBy]: orderDescString
      }
    }
  } else {
    orderByQuery = {
      timestamp: orderDescString
    }
  }

  const where: Prisma.TransactionWhereInput = {
    address: {
      userProfiles: { some: { userId } }
    },
    isPayment: true
  }

  if (startDate !== undefined && endDate !== undefined && startDate !== '' && endDate !== '') {
    Object.assign(where, getDateRangeFilter(new Date(startDate), new Date(endDate), timezone))
  } else if (years !== undefined && years.length > 0) {
    where.OR = getYearFilters(years, timezone)
  }

  if ((buttonIds !== undefined) && buttonIds.length > 0) {
    where.address!.paybuttons = {
      some: {
        paybutton: {
          id: { in: buttonIds }
        }
      }
    }
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
  const where: Prisma.TransactionWhereInput = {
    address: {
      userProfiles: {
        some: { userId }
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
