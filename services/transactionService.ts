import prisma from 'prisma/clientInstance'
import { Address, Prisma, Transaction } from '@prisma/client'
import { syncTransactionsForAddress, subscribeAddresses } from 'services/blockchainService'
import { fetchAddressBySubstring, fetchAddressById, fetchAddressesByPaybuttonId, addressExists, setSyncing } from 'services/addressService'
import { QuoteValues, fetchPricesForNetworkAndTimestamp } from 'services/priceService'
import { RESPONSE_MESSAGES, USD_QUOTE_ID, CAD_QUOTE_ID, N_OF_QUOTES, KeyValueT, UPSERT_TRANSACTION_PRICES_ON_DB_TIMEOUT, SupportedQuotesType, NETWORK_IDS } from 'constants/index'
import { productionAddresses } from 'prisma/seeds/addresses'
import { appendTxsToFile } from 'prisma/seeds/transactions'
import _ from 'lodash'
import { CacheSet } from 'redis/index'
import { SimplifiedTransaction } from 'ws-service/types'
import { OpReturnData, parseAddress } from 'utils/validators'
import { generatePaymentFromTx } from 'redis/paymentCache'
import { Payment } from 'redis/types'

export async function getTransactionValue (transaction: TransactionWithPrices | TransactionsWithPaybuttonsAndPrices): Promise<QuoteValues> {
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

export function getSimplifiedTrasaction (tx: TransactionWithAddressAndPrices): SimplifiedTransaction {
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
    rawMessage: parsedOpReturn?.rawMessage ?? ''
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

const transactionsWithPaybuttonsAndPrices = Prisma.validator<Prisma.TransactionDefaultArgs>()(
  {
    include: includePaybuttonsAndPrices
  }
)

export type TransactionsWithPaybuttonsAndPrices = Prisma.TransactionGetPayload<typeof transactionsWithPaybuttonsAndPrices>

export const transactionWithAddressAndPricesAndButtons = Prisma.validator<Prisma.TransactionDefaultArgs>()({
  include: {
    address: {
      include: {
        paybuttons: {
          include: {
            paybutton: true // Include full Paybutton data
          }
        }
      }
    },
    prices: true // Include related price data
  }
})

export type TransactionWithAddressAndPricesAndButtons = Prisma.TransactionGetPayload<typeof transactionWithAddressAndPricesAndButtons>

export async function fetchTransactionsByAddressList (
  addressIdList: string[],
  networkIdsListFilter?: number[]
): Promise<TransactionWithAddressAndPrices[]> {
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
    include: includeAddressAndPrices,
    orderBy: {
      timestamp: 'asc'
    }
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

export async function fetchTransactionsWithPaybuttonsAndPricesForAddress (addressId: string): Promise<TransactionsWithPaybuttonsAndPrices[]> {
  return await prisma.transaction.findMany({
    where: {
      addressId
    },
    include: includePaybuttonsAndPrices
  })
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

export async function createTransaction (
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
  void await connectTransactionToPrices(createdTx, prisma)
  const txWithPaybuttonsAndPrices = await fetchTransactionWithPaybuttonsAndPrices(createdTx.id)
  void await CacheSet.txCreation(txWithPaybuttonsAndPrices)
  return {
    tx: txWithPaybuttonsAndPrices,
    created
  }
}

export async function connectTransactionToPrices (tx: Transaction, prisma: Prisma.TransactionClient, disconnectBefore = true): Promise<void> {
  const networkId = await getTransactionNetworkId(tx)
  const allPrices = await fetchPricesForNetworkAndTimestamp(networkId, tx.timestamp, prisma)

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
  await prisma.$transaction(async (prisma) => {
    void await prisma.pricesOnTransactions.deleteMany({
      where: {
        transactionId: {
          in: txList.map(t => t.id)
        }
      }
    })
    await Promise.all(txList.map(async tx =>
      await connectTransactionToPrices(tx, prisma, false)
    ))
  })
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

interface SyncAndSubscriptionReturn {
  failedAddressesWithErrors: KeyValueT<string>
  successfulAddressesWithCount: KeyValueT<number>
}

export async function syncAddresses (addresses: Address[]): Promise<SyncAndSubscriptionReturn> {
  const failedAddressesWithErrors: KeyValueT<string> = {}
  const successfulAddressesWithCount: KeyValueT<number> = {}
  let txsToSave: Prisma.TransactionCreateManyInput[] = []

  const productionAddressesIds = productionAddresses.map(addr => addr.id)
  for (const addr of addresses) {
    try {
      const generator = syncTransactionsForAddress(addr.address)
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
  return {
    failedAddressesWithErrors,
    successfulAddressesWithCount
  }
}

export const syncAndSubscribeAddresses = async (addresses: Address[]): Promise<SyncAndSubscriptionReturn> => {
  const failedAddressesWithErrors: KeyValueT<string> = {}
  const successfulAddressesWithCount: KeyValueT<number> = {}
  let txsToSave: Prisma.TransactionCreateManyInput[] = []

  const productionAddressesIds = productionAddresses.map(addr => addr.id)
  await Promise.all(
    addresses.map(async (addr) => {
      try {
        await subscribeAddresses([addr])
        const generator = syncTransactionsForAddress(addr.address)
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
  const txs = await prisma.transaction.findMany({
    where: {
      prices: {
        some: {}
      }
    },
    include: {
      prices: true
    }
  })
  return txs.filter(t => t.prices.length !== 2)
}

export async function fetchTransactionsByPaybuttonId (paybuttonId: string, networkIds?: number[]): Promise<TransactionWithAddressAndPrices[]> {
  const addressIdList = await fetchAddressesByPaybuttonId(paybuttonId)
  const transactions = await fetchTransactionsByAddressList(addressIdList, networkIds)

  if (transactions.length === 0) {
    throw new Error(RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404.message)
  }

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
  orderDesc = true
): Promise<Payment[]> {
  const offset = page * pageSize

  let transactions: any = []
  // code is repeated because prisma does not allow to inject SQL keywords
  if (orderDesc) {
    transactions = await prisma.$queryRaw`
      SELECT 
        t.*, 
        p.id AS paybuttonId, 
        p.name AS paybuttonName, 
        p.providerUserId AS paybuttonProviderUserId,
        a.networkId as newtworkId,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'priceId', pb.id,
            'priceValue', pb.value,
            'quoteId', pb.quoteId
          )
        ) AS prices
      FROM \`Transaction\` t
      INNER JOIN \`Address\` a ON t.\`addressId\` = a.\`id\`
      INNER JOIN \`AddressesOnButtons\` ab ON a.\`id\` = ab.\`addressId\`
      INNER JOIN \`Paybutton\` p ON ab.\`paybuttonId\` = p.\`id\`
      LEFT JOIN \`PricesOnTransactions\` pt ON t.\`id\` = pt.\`transactionId\`
      LEFT JOIN \`Price\` pb ON pt.\`priceId\` = pb.\`id\`
      WHERE EXISTS (
        SELECT 1
        FROM \`AddressesOnUserProfiles\` au
        WHERE au.\`addressId\` = a.\`id\`
          AND au.\`userId\` = ${userId}
      )
      AND p.\`providerUserId\` = ${userId}
      GROUP BY t.id, p.id
      ORDER BY p.\`name\` ASC
      LIMIT ${pageSize}
      OFFSET ${offset};
    `
  } else {
    transactions = await prisma.$queryRaw`
      SELECT 
        t.*, 
        p.id AS paybuttonId, 
        p.name AS paybuttonName, 
        p.providerUserId AS paybuttonProviderUserId,
        a.networkId as newtworkId,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'priceId', pb.id,
            'priceValue', pb.value,
            'quoteId', pb.quoteId
          )
        ) AS prices
      FROM \`Transaction\` t
      INNER JOIN \`Address\` a ON t.\`addressId\` = a.\`id\`
      INNER JOIN \`AddressesOnButtons\` ab ON a.\`id\` = ab.\`addressId\`
      INNER JOIN \`Paybutton\` p ON ab.\`paybuttonId\` = p.\`id\`
      LEFT JOIN \`PricesOnTransactions\` pt ON t.\`id\` = pt.\`transactionId\`
      LEFT JOIN \`Price\` pb ON pt.\`priceId\` = pb.\`id\`
      WHERE t.\`amount\` > 0
      AND EXISTS (
        SELECT 1
        FROM \`AddressesOnUserProfiles\` au
        WHERE au.\`addressId\` = a.\`id\`
          AND au.\`userId\` = ${userId}
      )
      AND p.\`providerUserId\` = ${userId}
      GROUP BY t.id, p.id
      ORDER BY p.\`name\` DESC
      LIMIT ${pageSize}
      OFFSET ${offset};
    `
  }

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
    const buttonDisplayDataList: Array<{ name: string, id: string, providerUserId: string}> = []
    buttonDisplayDataList.push({
      name: tx.paybuttonName,
      id: tx.paybuttonName,
      providerUserId: tx.paybuttonProviderUserId
    })
    payments.push({
      timestamp: tx.timestamp,
      values: ret,
      networkId: tx.networkId,
      hash: tx.hash,
      buttonDisplayDataList
    })
  })

  return payments
}

export async function fetchAllPaymentsByUserIdWithPagination (
  userId: string,
  page: number,
  pageSize: number,
  orderBy?: string,
  orderDesc = true
): Promise<Payment[]> {
  const orderDescString: Prisma.SortOrder = orderDesc ? 'desc' : 'asc'

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
      if (orderBy === 'values') {
        orderByQuery = {
          amount: orderDescString
        }
      } else {
        orderByQuery = {
          [orderBy]: orderDescString
        }
      }
    }
  } else {
    // Default orderBy
    orderByQuery = {
      timestamp: orderDescString
    }
  }

  const transactions = await prisma.transaction.findMany({
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
    include: includePaybuttonsAndPrices,
    orderBy: orderByQuery,
    skip: page * Number(pageSize),
    take: Number(pageSize)
  })

  const transformedData: Payment[] = []
  for (let index = 0; index < transactions.length; index++) {
    const tx = transactions[index]
    if (Number(tx.amount) > 0) {
      const payment = await generatePaymentFromTx(tx)
      transformedData.push(payment)
    }
  }
  return transformedData
}

export async function fetchAllPaymentsByUserId (
  userId: string,
  page: number,
  pageSize: number,
  orderBy?: string,
  orderDesc = true
): Promise<Payment[]> {
  if (orderBy === 'buttonDisplayDataList') {
    return await getPaymentsByUserIdOrderedByButtonName(
      userId, page, pageSize, orderDesc
    )
  } else {
    return await fetchAllPaymentsByUserIdWithPagination(
      userId,
      page,
      pageSize,
      orderBy,
      orderDesc
    )
  }
}
