import prisma from 'prisma/clientInstance'
import { Prisma } from '@prisma/client'
import { syncTransactionsForAddress, GetAddressTransactionsParameters } from 'services/blockchainService'
import { parseAddress } from 'utils/validators'
import { fetchAddressBySubstring, updateLastSynced } from 'services/addressService'
import { QuoteValues, connectTransactionToPrices } from 'services/priceService'
import { FETCH_N_TIMEOUT, RESPONSE_MESSAGES, USD_QUOTE_ID, CAD_QUOTE_ID, N_OF_QUOTES } from 'constants/index'
import { v4 as uuid } from 'uuid'
import _ from 'lodash'

export async function getTransactionValue (transaction: TransactionWithAddressAndPrices): Promise<QuoteValues> {
  const ret: QuoteValues = {
    usd: new Prisma.Decimal(0),
    cad: new Prisma.Decimal(0)
  }
  if (transaction.prices.length !== N_OF_QUOTES) throw new Error(`txid${transaction.id}, ts${transaction.timestamp} ${RESPONSE_MESSAGES.MISSING_PRICE_FOR_TRANSACTION_400.message}`)
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

const includeAddressAndPrices = {
  address: true,
  prices: {
    include: {
      price: true
    }
  }
}

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

export async function createTransaction (transactionData: Prisma.TransactionUncheckedCreateInput, includePrices = false): Promise<TransactionWithAddressAndPrices | undefined> {
  if (transactionData.amount === new Prisma.Decimal(0)) { // out transactions
    return
  }
  transactionData.hash = await base64HashToHex(transactionData.hash)
  const createdTx = await prisma.transaction.create({
    data: transactionData,
    include: includeAddressAndPrices
  })
  if (includePrices) {
    void connectTransactionToPrices(createdTx)
    return fetchTransactionById(createdTx.id)
  }
  return createdTx
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

export async function createManyTransactions (transactionsData: Prisma.TransactionUncheckedCreateInput[]): Promise<TransactionWithAddressAndPrices[]> {
  const uuidList = await addUUIDToTransactions(transactionsData)
  await prisma.transaction.createMany({
    data: transactionsData
  })
  if (includePrices) {
    void connectTransactionsToPricesByUIIDList(uuidList)
  }
  return await prisma.transaction.findMany({
    where: {
      id: {
        in: uuidList
      }
    },
    include: includeAddressAndPrices
  })
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
