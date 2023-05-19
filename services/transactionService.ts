import prisma from 'prisma/clientInstance'
import { Prisma, Transaction } from '@prisma/client'
import { syncTransactionsForAddress, GetAddressTransactionsParameters } from 'services/blockchainService'
import { parseAddress } from 'utils/validators'
import { fetchAddressBySubstring, updateLastSynced, fetchAddressById } from 'services/addressService'
import { QuoteValues, fetchPricesForNetworkAndTimestamp } from 'services/priceService'
import { RESPONSE_MESSAGES, USD_QUOTE_ID, CAD_QUOTE_ID, N_OF_QUOTES } from 'constants/index'
import { cacheManyTxs } from 'redis/dashboardCache'
import { v4 as uuid } from 'uuid'
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

export async function base64HashToHex (base64Hash: string): Promise<string> {
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
  const createdTx = await prisma.transaction.create({
    data: transactionData,
    include: includeAddressAndPrices
  })
  void await connectTransactionToPrices(createdTx, prisma)
  const tx = await fetchTransactionById(createdTx.id)
  void await cacheManyTxs([tx])
  return tx
}

async function addUUIDToTransactions (transactions: Prisma.TransactionUncheckedCreateInput[]): Promise<string[]> {
  const txsLen = transactions.length
  const uuidList = []
  for (let i = 0; i < txsLen; i++) {
    const id = uuid()
    transactions[i].id = id
    uuidList.push(id)
  }
  return uuidList
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

export async function connectTransactionsToPricesByIdList (idList: string[]): Promise<void> {
  return await prisma.$transaction(async (p) => {
    const promises = idList.map(async (id) => {
      const tx = await fetchTransactionById(id)
      return await connectTransactionToPrices(tx, p)
    })
    void await Promise.all(promises)
  })
}

export async function createManyTransactions (
  transactionsData: Prisma.TransactionUncheckedCreateInput[]
): Promise<TransactionWithAddressAndPrices[]> {
  const uuidList = await addUUIDToTransactions(transactionsData)
  await prisma.transaction.createMany({
    data: transactionsData
  })
  void await connectTransactionsToPricesByIdList(uuidList)
  const txs = await prisma.transaction.findMany({
    where: {
      id: {
        in: uuidList
      }
    },
    include: includeAddressAndPrices
  })
  void await cacheManyTxs(txs)
  return txs
}

export async function syncAllTransactionsForAddress (addressString: string, maxTransactionsToReturn: number): Promise<TransactionWithAddressAndPrices[]> {
  addressString = parseAddress(addressString)
  const parameters = {
    addressString,
    start: 0,
    maxTransactionsToReturn
  }

  const insertedTransactions: TransactionWithAddressAndPrices[] = await syncTransactionsForAddress(parameters)

  if (parameters.maxTransactionsToReturn === Infinity || insertedTransactions.filter(t => t.confirmed).length < parameters.maxTransactionsToReturn) {
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
      hash: await base64HashToHex(hash),
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
