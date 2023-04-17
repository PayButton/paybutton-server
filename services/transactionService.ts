import prisma from 'prisma/clientInstance'
import { Prisma } from '@prisma/client'
import { syncTransactionsForAddress, GetAddressTransactionsParameters } from 'services/blockchainService'
import { parseAddress } from 'utils/validators'
import { fetchAddressBySubstring, updateLastSynced, AddressWithUserProfiles } from 'services/addressService'
import { QuoteValues, connectTransactionToPrices } from 'services/priceService'
import { FETCH_N_TIMEOUT, RESPONSE_MESSAGES, USD_QUOTE_ID, CAD_QUOTE_ID, N_OF_QUOTES } from 'constants/index'
import { getPaymentsFromTransactions, cachePayments } from 'redis/dashboardCache'
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

export async function upsertTransaction (transaction: Prisma.TransactionUncheckedCreateInput, address: AddressWithUserProfiles, cache = true): Promise<TransactionWithAddressAndPrices | undefined> {
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
  const tx = await prisma.transaction.upsert({
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
  if (cache) {
    if (tx === undefined) {
      throw new Error(RESPONSE_MESSAGES.FAILED_TO_UPSERT_TRANSACTION_500.message)
    }
    const payments = await getPaymentsFromTransactions([tx])
    for (const userProfile of address.userProfiles) {
      await cachePayments(userProfile.userProfile.userId, payments)
    }
    void connectTransactionToPrices(tx, address.networkId)
    return await fetchTransactionById(tx.id)
  }
  return tx
}

export async function upsertManyTransactionsForAddress (transactions: Prisma.TransactionUncheckedCreateInput[], address: AddressWithUserProfiles, cache = true): Promise<TransactionWithAddressAndPrices[]> {
  const txs = await prisma.$transaction(async (_) => {
    const insertedTransactions: Array<TransactionWithAddressAndPrices | undefined> = await Promise.all(
      transactions.map(async (transaction) => {
        return await upsertTransaction(transaction, address, cache)
      })
    )
    return insertedTransactions
  }, {
    timeout: FETCH_N_TIMEOUT
  })
  const ret = txs.filter((t) => t !== undefined) as TransactionWithAddressAndPrices[]
  if (cache) {
    const payments = await getPaymentsFromTransactions(ret)
    for (const userProfile of address.userProfiles) {
      await cachePayments(userProfile.userProfile.userId, payments)
    }
  }
  return ret
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
