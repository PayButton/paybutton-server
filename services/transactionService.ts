import prisma from 'prisma/clientInstance'
import { Address, Prisma, Transaction } from '@prisma/client'
import { syncTransactionsForAddress, subscribeAddresses } from 'services/blockchainService'
import { fetchAddressBySubstring, fetchAddressById } from 'services/addressService'
import { QuoteValues, fetchPricesForNetworkAndTimestamp } from 'services/priceService'
import { RESPONSE_MESSAGES, USD_QUOTE_ID, CAD_QUOTE_ID, N_OF_QUOTES, KeyValueT } from 'constants/index'
import { cacheManyTxs } from 'redis/paymentCache'
import { productionAddresses } from 'prisma/seeds/addresses'
import { appendTxsToFile } from 'prisma/seeds/transactions'
import _ from 'lodash'

export async function getTransactionValue (transaction: TransactionWithPrices): Promise<QuoteValues> {
  const ret: QuoteValues = {
    usd: new Prisma.Decimal(0),
    cad: new Prisma.Decimal(0)
  }
  if (transaction.prices.length !== N_OF_QUOTES) throw new Error(`txid${transaction.id}, ts${transaction.timestamp} ${RESPONSE_MESSAGES.MISSING_PRICE_FOR_TRANSACTION_400.message}: found ${transaction.prices.length}.`)
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

const transactionWithPrices = Prisma.validator<Prisma.TransactionArgs>()(
  { include: includePrices }
)

export type TransactionWithPrices = Prisma.TransactionGetPayload<typeof transactionWithPrices>

const transactionWithAddressAndPrices = Prisma.validator<Prisma.TransactionArgs>()(
  { include: includeAddressAndPrices }
)

export type TransactionWithAddressAndPrices = Prisma.TransactionGetPayload<typeof transactionWithAddressAndPrices>

export async function fetchAddressListTransactions (addressIdList: string[]): Promise<TransactionWithAddressAndPrices[]> {
  return await prisma.transaction.findMany({
    where: {
      addressId: {
        in: addressIdList
      }
    },
    include: includeAddressAndPrices
  })
}

export async function fetchTxCount (addressString: string): Promise<number> {
  const address = await fetchAddressBySubstring(addressString)
  return await prisma.transaction.count({
    where: {
      addressId: address.id
    }
  })
}

export async function fetchPaginatedAddressTransactions (addressString: string, page: number, pageSize: number, orderBy?: string, orderDesc = true): Promise<TransactionWithAddressAndPrices[]> {
  const address = await fetchAddressBySubstring(addressString)
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
      addressId: address.id
    },
    include: includeAddressAndPrices,
    orderBy: orderByQuery,
    skip: page * pageSize,
    take: pageSize
  })
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
  const txWithPrices = await fetchTransactionById(createdTx.id)
  void await cacheManyTxs([txWithPrices])
  return {
    tx: txWithPrices,
    created
  }
}

export async function connectTransactionToPrices (tx: Transaction, prisma: Prisma.TransactionClient): Promise<void> {
  const networkId = await getTransactionNetworkId(tx)
  const allPrices = await fetchPricesForNetworkAndTimestamp(networkId, tx.timestamp, prisma)
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
    for (const tx of txList) {
      await connectTransactionToPrices(tx, prisma)
    }
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
        update: {}
      })
      insertedTransactionsDistinguished.push({
        tx: upsertedTx,
        isCreated: upsertedTx.createdAt.getTime() === upsertedTx.updatedAt.getTime()
      })
    }
  })
  const insertedTransactions = insertedTransactionsDistinguished
    .filter(txD => txD.isCreated)
    .map(txD => txD.tx)
  void await connectTransactionsListToPrices(insertedTransactions)
  const txsWithPrices = await prisma.transaction.findMany({
    where: {
      id: {
        in: insertedTransactions.map(tx => tx.id)
      }
    },
    include: includeAddressAndPrices
  })
  void await cacheManyTxs(txsWithPrices)
  return txsWithPrices
}

interface SyncAndSubscriptionReturn {
  failedAddressesWithErrors: KeyValueT<string>
}

export async function syncAddresses (addresses: Address[]): Promise<SyncAndSubscriptionReturn> {
  const failedAddressesWithErrors: KeyValueT<string> = {}
  let txsToSave: Prisma.TransactionCreateManyInput[] = []

  const productionAddressesIds = productionAddresses.map(addr => addr.id)
  await Promise.all(
    addresses.map(async (addr) => {
      try {
        const generator = syncTransactionsForAddress(addr.address)
        while (true) {
          const result = await generator.next()
          if (result.done === true) break
          if (productionAddressesIds.includes(addr.id)) {
            const txs = result.value
            txsToSave = txsToSave.concat(txs)
            if (txsToSave.length !== 0) {
              await appendTxsToFile(txsToSave)
            }
          }
        }
      } catch (err: any) {
        failedAddressesWithErrors[addr.address] = err.stack
      }
    })
  )
  return {
    failedAddressesWithErrors
  }
}

export const syncAndSubscribeAddresses = async (addresses: Address[]): Promise<SyncAndSubscriptionReturn> => {
  const failedAddressesWithErrors: KeyValueT<string> = {}
  let txsToSave: Prisma.TransactionCreateManyInput[] = []

  const productionAddressesIds = productionAddresses.map(addr => addr.id)
  await Promise.all(
    addresses.map(async (addr) => {
      try {
        await subscribeAddresses([addr])
        const generator = syncTransactionsForAddress(addr.address)
        while (true) {
          const result = await generator.next()
          if (result.done === true) break
          if (productionAddressesIds.includes(addr.id)) {
            const txs = result.value
            txsToSave = txsToSave.concat(txs)
            if (txsToSave.length !== 0) {
              await appendTxsToFile(txsToSave)
            }
          }
        }
      } catch (err: any) {
        failedAddressesWithErrors[addr.address] = err.stack
      }
    })
  )
  if (txsToSave.length !== 0) {
    await appendTxsToFile(txsToSave)
  }
  return {
    failedAddressesWithErrors
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
