import prisma from 'prisma/clientInstance'
import { Address, Prisma, Transaction } from '@prisma/client'
import { syncTransactionsForAddress, GetAddressTransactionsParameters } from 'services/blockchainService'
import { parseAddress } from 'utils/validators'
import { fetchAddressBySubstring, updateLastSynced, fetchAddressById } from 'services/addressService'
import { QuoteValues, fetchPricesForNetworkAndTimestamp } from 'services/priceService'
import { RESPONSE_MESSAGES, USD_QUOTE_ID, CAD_QUOTE_ID, N_OF_QUOTES, PRICE_CONNECT_MAX_N } from 'constants/index'
import { cacheManyTxs } from 'redis/dashboardCache'
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

export async function createTransaction (
  transactionData: Prisma.TransactionUncheckedCreateInput
): Promise<TransactionWithAddressAndPrices | undefined> {
  if (transactionData.amount === new Prisma.Decimal(0)) { // out transactions
    return
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
    update: {}
  })
  void await connectTransactionToPrices(createdTx, prisma)
  const tx = await fetchTransactionById(createdTx.id)
  void await cacheManyTxs([tx])
  return tx
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
  let completedPromises = 0
  while (completedPromises < txList.length) {
    const promises = txList
      .slice(completedPromises, completedPromises + PRICE_CONNECT_MAX_N)
      .map(async (tx) =>
        await connectTransactionToPrices(tx, prisma)
      )
    const completed = await Promise.all(promises)
    completedPromises += completed.length
  }
}

export async function createManyTransactions (
  transactionsData: Prisma.TransactionUncheckedCreateInput[]
): Promise<TransactionWithAddressAndPrices[]> {
  // we don't use `createMany` to ignore conflicts between the sync and the subscription
  const insertedTransactions = await Promise.all(
    transactionsData.map(async tx =>
      await prisma.transaction.upsert({
        create: tx,
        where: {
          Transaction_hash_addressId_unique_constraint: {
            hash: tx.hash,
            addressId: tx.addressId
          }
        },
        update: {}
      })
    )
  )
  void await connectTransactionsListToPrices(insertedTransactions)
  const txs = await prisma.transaction.findMany({
    where: {
      id: {
        in: insertedTransactions.map(tx => tx.id)
      }
    },
    include: includeAddressAndPrices
  })
  void await cacheManyTxs(txs)
  return txs
}

export async function syncAllTransactionsForAddress (address: Address, maxTransactionsToReturn: number): Promise<TransactionWithAddressAndPrices[]> {
  const addressString = parseAddress(address.address)
  const parameters = {
    addressString,
    start: 0,
    maxTransactionsToReturn
  }

  const insertedTransactions: TransactionWithAddressAndPrices[] = await syncTransactionsForAddress(parameters)

  if (
    maxTransactionsToReturn === Infinity ||
    insertedTransactions.filter(t => t.confirmed).length < maxTransactionsToReturn
  ) {
    await updateLastSynced(addressString)
  } else {
    const newParameters: GetAddressTransactionsParameters = {
      addressString,
      start: insertedTransactions.filter(t => t.confirmed).length,
      maxTransactionsToReturn: Infinity
    }
    void syncTransactionsForAddress(newParameters)
  }

  return insertedTransactions
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
