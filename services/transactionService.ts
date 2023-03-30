import prisma from 'prisma/clientInstance'
import { Prisma, Address, Transaction as TransactionPrisma } from '@prisma/client'
import { getAddressTransactions, GetAddressTransactionsParameters } from 'services/blockchainService'
import { parseAddress } from 'utils/validators'
import { fetchAddressBySubstring, updateLastSynced } from 'services/addressService'
import { syncPricesFromTransactionList, QuoteValues } from 'services/priceService'
import { FETCH_N_TIMEOUT, RESPONSE_MESSAGES, USD_QUOTE_ID, CAD_QUOTE_ID, N_OF_QUOTES } from 'constants/index'
import _ from 'lodash'

const { ADDRESS_NOT_PROVIDED_400 } = RESPONSE_MESSAGES

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

export async function fetchAddressListTransactions (addressIdList: number[]): Promise<TransactionWithAddressAndPrices[]> {
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

export async function upsertTransaction (transaction: TransactionPrisma, address: Address): Promise<TransactionWithAddressAndPrices | undefined> {
  if (transaction.amount === new Prisma.Decimal(0)) { // out transactions
    return
  }
  const hash = await base64HashToHex(transaction.hash)
  const transactionParams = {
    hash,
    amount: transaction.amount,
    addressId: address.id,
    timestamp: transaction.timestamp,
    confirmed: transaction.confirmed
  }
  return await prisma.transaction.upsert({
    where: {
      Transaction_hash_addressId_unique_constraint: {
        hash: transactionParams.hash,
        addressId: address.id
      }
    },
    update: transactionParams,
    create: transactionParams,
    include: includeAddressAndPrices
  })
}

export async function upsertManyTransactionsForAddress (transactions: TransactionPrisma[], address: Address): Promise<TransactionWithAddressAndPrices[]> {
  const ret = await prisma.$transaction(async (_) => {
    const insertedTransactions: Array<TransactionWithAddressAndPrices | undefined> = await Promise.all(
      transactions.map(async (transaction) => {
        return await upsertTransaction(transaction, address)
      })
    )
    return insertedTransactions
  }, {
    timeout: FETCH_N_TIMEOUT
  })
  return ret.filter((t) => t !== undefined) as TransactionWithAddressAndPrices[]
}

async function syncTransactionsForAddress (parameters: GetAddressTransactionsParameters): Promise<TransactionWithAddressAndPrices[]> {
  const address = await fetchAddressBySubstring(parameters.addressString)

  const addressTransactions = await getAddressTransactions(parameters)
  const insertedTransactions: TransactionWithAddressAndPrices[] = [
    ...await upsertManyTransactionsForAddress(addressTransactions.confirmed, address),
    ...await upsertManyTransactionsForAddress(addressTransactions.unconfirmed, address)
  ]

  if (parameters.maxTransactions === Infinity || addressTransactions.confirmed.length < parameters.maxTransactions) {
    await updateLastSynced(parameters.addressString)
  } else {
    const newParameters = {
      addressString: parameters.addressString,
      start: parameters.start + addressTransactions.confirmed.length,
      maxTransactions: Infinity
    }
    void syncTransactionsForAddress(newParameters)
  }

  return insertedTransactions
}

export async function syncTransactionsAndPricesForAddress (addressString: string, maxTransactions: number): Promise<TransactionWithAddressAndPrices[]> {
  const address = parseAddress(addressString)
  if (address === '' || address === undefined) {
    throw new Error(ADDRESS_NOT_PROVIDED_400.message)
  }
  const parameters = {
    addressString: address,
    start: 0,
    maxTransactions
  }
  const insertedTransactions = await syncTransactionsForAddress(parameters)
  await syncPricesFromTransactionList(insertedTransactions)
  return insertedTransactions
}
