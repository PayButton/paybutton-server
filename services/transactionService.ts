import prisma from 'prisma/clientInstance'
import { Prisma, Transaction } from '@prisma/client'
import { RESPONSE_MESSAGES, USD_QUOTE_ID, CAD_QUOTE_ID, N_OF_QUOTES, UPSERT_TRANSACTION_PRICES_ON_DB_TIMEOUT, SupportedQuotesType, NETWORK_IDS } from 'constants/index'
import { fetchAddressBySubstring, fetchAddressById, fetchAddressesByPaybuttonId, addressExists } from 'services/addressService'
import { AllPrices, QuoteValues, fetchPricesForNetworkAndTimestamp, flattenTimestamp } from 'services/priceService'
import _ from 'lodash'
import { CacheSet } from 'redis/index'
import { SimplifiedTransaction } from 'ws-service/types'
import { OpReturnData, parseAddress } from 'utils/validators'
import { generatePaymentFromTxWithInvoices } from 'redis/paymentCache'
import { ButtonDisplayData, Payment } from 'redis/types'

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

export function getSimplifiedTrasaction (tx: TransactionWithAddressAndPrices, inputAddresses?: string[]): SimplifiedTransaction {
  const {
    hash,
    amount,
    confirmed,
    opReturn,
    address,
    timestamp
  } = tx

  const parsedOpReturn = resolveOpReturn(opReturn)

  const simplifiedTransaction: SimplifiedTransaction = {
    hash,
    amount,
    paymentId: parsedOpReturn?.paymentId ?? '',
    confirmed,
    address: address.address,
    timestamp,
    message: parsedOpReturn?.message ?? '',
    rawMessage: parsedOpReturn?.rawMessage ?? '',
    inputAddresses: inputAddresses ?? [],
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
  ...includePrices
}

const transactionWithPrices = Prisma.validator<Prisma.TransactionDefaultArgs>()(
  { include: includePrices }
)

export type TransactionWithPrices = Prisma.TransactionGetPayload<typeof transactionWithPrices>

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
  ...includePrices
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
  networkIdsListFilter?: number[]
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
    include: includePaybuttonsAndPricesAndInvoices,
    orderBy: orderByQuery,
    skip: page * pageSize,
    take: pageSize
  })
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
  const allPrices = await fetchPricesForNetworkAndTimestamp(Number(networkId), ts, prisma)
  await connectTransactionToPrices(createdTx, prisma, allPrices)
  const txWithPaybuttonsAndPrices = await fetchTransactionWithPaybuttonsAndPrices(createdTx.id)
  await CacheSet.txCreation(txWithPaybuttonsAndPrices)
  return {
    tx: txWithPaybuttonsAndPrices,
    created
  }
}

export async function connectTransactionToPrices (tx: Transaction, prisma: Prisma.TransactionClient, allPrices: AllPrices, disconnectBefore = true): Promise<void> {
  if (disconnectBefore) {
    void await prisma.pricesOnTransactions.deleteMany({
      where: {
        transactionId: tx.id
      }
    })
  }
  void await prisma.pricesOnTransactions.upsert({
    where: {
      priceId_transactionId: {
        priceId: allPrices.usd.id,
        transactionId: tx.id
      }
    },
    create: {
      transactionId: tx.id,
      priceId: allPrices.usd.id
    },
    update: {}
  })
  void await prisma.pricesOnTransactions.upsert({
    where: {
      priceId_transactionId: {
        priceId: allPrices.cad.id,
        transactionId: tx.id
      }
    },
    create: {
      transactionId: tx.id,
      priceId: allPrices.cad.id
    },
    update: {}
  })
}

export async function connectTransactionsListToPrices (txList: Transaction[]): Promise<void> {
  const networkIdToUniqueTimestamp: Record<number, number[]> = {}
  await Promise.all(txList.map(async tx => {
    const networkId = await getTransactionNetworkId(tx)
    if (networkIdToUniqueTimestamp[networkId] === undefined) {
      networkIdToUniqueTimestamp[networkId] = []
    }
    networkIdToUniqueTimestamp[networkId].push(
      flattenTimestamp(tx.timestamp)
    )
  }))

  const timestampToPrice: Record<number, AllPrices> = {}
  for (const networkId of Object.keys(networkIdToUniqueTimestamp)) {
    for (const timestamp of networkIdToUniqueTimestamp[Number(networkId)]) {
      const allPrices = await fetchPricesForNetworkAndTimestamp(Number(networkId), timestamp, prisma)
      timestampToPrice[timestamp] = allPrices
    }
  }

  await prisma.$transaction(async (prisma) => {
    void await prisma.pricesOnTransactions.deleteMany({
      where: {
        transactionId: {
          in: txList.map(t => t.id)
        }
      }
    })
    await Promise.all(txList.map(async tx => {
      const ts = flattenTimestamp(tx.timestamp)
      const allPrices = timestampToPrice[ts]
      await connectTransactionToPrices(tx, prisma, allPrices, false)
    }))
  })
}

export async function connectAllTransactionsToPrices (): Promise<void> {
  const noPricesTxs = await fetchAllTransactionsWithNoPrices()
  const wrongNumberOfPricesTxs = await fetchAllTransactionsWithIrregularPrices()
  const txs = [
    ...noPricesTxs,
    ...wrongNumberOfPricesTxs
  ]
  console.log(`[PRICES] Connecting ${noPricesTxs.length} txs with no prices and ${wrongNumberOfPricesTxs.length} with irregular prices...`)
  void await connectTransactionsListToPrices(txs)
  console.log('[PRICES] Finished connecting txs to prices.')
}

interface TxDistinguished {
  tx: Transaction
  isCreated: boolean
}

export async function createManyTransactions (
  transactionsData: Prisma.TransactionUncheckedCreateInput[]
): Promise<TransactionWithAddressAndPrices[]> {
  // we don't use `createMany` to ignore conflicts between the sync and the subscription
  // and we don't return transactions that were updated, only ones that were created
  const insertedTransactionsDistinguished: TxDistinguished[] = []
  await prisma.$transaction(async (prisma) => {
    for (const tx of transactionsData) {
      const upsertedTx = await prisma.transaction.upsert({
        create: tx,
        where: {
          Transaction_hash_addressId_unique_constraint: {
            hash: tx.hash,
            addressId: tx.addressId
          }
        },
        update: {
          confirmed: tx.confirmed,
          timestamp: tx.timestamp
        }
      })
      insertedTransactionsDistinguished.push({
        tx: upsertedTx,
        isCreated: upsertedTx.createdAt.getTime() === upsertedTx.updatedAt.getTime()
      })
    }
  },
  {
    timeout: UPSERT_TRANSACTION_PRICES_ON_DB_TIMEOUT
  }
  )
  const insertedTransactions = insertedTransactionsDistinguished
    .filter(txD => txD.isCreated)
    .map(txD => txD.tx)
  void await connectTransactionsListToPrices(insertedTransactions)
  const txsWithPaybuttonsAndPrices = await fetchTransactionsWithPaybuttonsAndPricesForIdList(insertedTransactions.map(tx => tx.id))
  void await CacheSet.txsCreation(txsWithPaybuttonsAndPrices)
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

export async function fetchAllTransactionsWithNoPrices (): Promise<Transaction[]> {
  const x = await prisma.transaction.findMany({
    where: {
      prices: {
        none: {}
      }
    }
  })
  return x
}

export async function fetchAllTransactionsWithIrregularPrices (): Promise<Transaction[]> {
  return await prisma.$queryRaw<Transaction[]>`
  SELECT t.*
  FROM Transaction t
  WHERE (
    SELECT COUNT(*)
    FROM PricesOnTransactions pot
    WHERE pot.transactionId = t.id
  ) = 1;
`
}

export async function fetchTransactionsByPaybuttonId (paybuttonId: string, networkIds?: number[]): Promise<TransactionsWithPaybuttonsAndPrices[]> {
  const addressIdList = await fetchAddressesByPaybuttonId(paybuttonId)
  const transactions = await fetchTransactionsByAddressList(addressIdList, networkIds)

  if (transactions.length === 0) {
    throw new Error(RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404.message)
  }

  return transactions
}

export async function fetchTransactionsByPaybuttonIdWithPagination (
  paybuttonId: string,
  page: number,
  pageSize: number,
  orderDesc: boolean,
  orderBy?: string,
  networkIds?: number[]): Promise<TransactionsWithPaybuttonsAndPrices[]> {
  const addressIdList = await fetchAddressesByPaybuttonId(paybuttonId)
  const transactions = await fetchTransactionsByAddressListWithPagination(
    addressIdList,
    page,
    pageSize,
    orderBy,
    orderDesc,
    networkIds)

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
    WHERE t.\`amount\` > 0
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
  orderBy?: string,
  orderDesc = true,
  buttonIds?: string[]
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
      userProfiles: {
        some: { userId }
      }
    },
    amount: {
      gt: 0
    }
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

  const transactions = await prisma.transaction.findMany({
    where,
    include: includePaybuttonsAndPricesAndInvoices,
    orderBy: orderByQuery,
    skip: page * Number(pageSize),
    take: Number(pageSize)
  })

  const transformedData: Payment[] = []
  for (let index = 0; index < transactions.length; index++) {
    const tx = transactions[index]
    if (Number(tx.amount) > 0) {
      const payment = await generatePaymentFromTxWithInvoices(tx, userId)
      transformedData.push(payment)
    }
  }
  return transformedData
}

export async function fetchAllPaymentsByUserId (
  userId: string,
  networkIds?: number[],
  buttonIds?: string[]
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
    amount: {
      gt: 0
    }
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
  buttonIds: string[]
): Promise<number> => {
  return await prisma.transaction.count({
    where: {
      address: {
        userProfiles: {
          some: { userId }
        },
        paybuttons: {
          some: {
            paybutton: { id: { in: buttonIds } }
          }
        }
      },
      amount: { gt: 0 }
    }
  })
}
