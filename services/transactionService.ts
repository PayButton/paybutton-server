import { Transaction as BCHTransaction } from 'grpc-bchrpc-node'
import prisma from 'prisma/clientInstance'
import { Prisma, Address } from '@prisma/client'
import grpcService from 'services/grpcService'
import { parseAddress } from 'utils/validators'
import { satoshisToUnit, pubkeyToAddress, removeAddressPrefix } from 'utils/index'
import { fetchAddressBySubstring } from 'services/addressService'
import { syncPricesFromTransactionList, QuoteValues } from 'services/priceService'
import _ from 'lodash'

import { RESPONSE_MESSAGES, FETCH_N, FETCH_DELAY, USD_QUOTE_ID, CAD_QUOTE_ID, XEC_NETWORK_ID, BCH_NETWORK_ID, XEC_TIMESTAMP_THRESHOLD, BCH_TIMESTAMP_THRESHOLD, N_OF_QUOTES } from 'constants/index'
import xecaddr from 'xecaddrjs'

const { ADDRESS_NOT_PROVIDED_400 } = RESPONSE_MESSAGES

export async function getTransactionAmount (transaction: BCHTransaction.AsObject, addressString: string): Promise<Prisma.Decimal> {
  let totalOutput = 0
  let totalInput = 0
  const addressFormat = xecaddr.detectAddressFormat(addressString)
  const unprefixedAddress = removeAddressPrefix(addressString)

  for (const output of transaction.outputsList) {
    let outAddress: string | undefined = removeAddressPrefix(output.address)
    if (output.scriptClass === 'pubkey') {
      outAddress = await pubkeyToAddress(outAddress, addressFormat)
      if (outAddress !== undefined) outAddress = removeAddressPrefix(outAddress)
    }
    if (unprefixedAddress === outAddress) {
      totalOutput += output.value
    }
  }
  for (const input of transaction.inputsList) {
    let addressFromPkey = await pubkeyToAddress(input.address, addressFormat)
    if (addressFromPkey !== undefined) addressFromPkey = removeAddressPrefix(addressFromPkey)
    if (unprefixedAddress === removeAddressPrefix(input.address) || unprefixedAddress === addressFromPkey) {
      totalInput += input.value
    }
  }
  const satoshis = new Prisma.Decimal(totalOutput).minus(totalInput)
  return await satoshisToUnit(
    satoshis,
    addressFormat
  )
}

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

export async function upsertTransaction (transaction: BCHTransaction.AsObject, address: Address): Promise<TransactionWithAddressAndPrices | undefined> {
  const receivedAmount = await getTransactionAmount(transaction, address.address)
  if (receivedAmount === new Prisma.Decimal(0)) { // out transactions
    return
  }
  const hash = await base64HashToHex(transaction.hash as string)
  const transactionParams = {
    hash,
    amount: receivedAmount,
    addressId: address.id,
    timestamp: transaction.timestamp
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

export async function upsertManyTransactions (transactions: BCHTransaction.AsObject[], address: Address): Promise<TransactionWithAddressAndPrices[]> {
  const ret = await prisma.$transaction(async (_) => {
    const insertedTransactions: Array<TransactionWithAddressAndPrices | undefined> = await Promise.all(
      transactions.map(async (transaction) => {
        return await upsertTransaction(transaction, address)
      })
    )
    return insertedTransactions
  })
  return ret.filter((t) => t !== undefined) as TransactionWithAddressAndPrices[]
}

export async function syncTransactionsForAddress (addressString: string): Promise<TransactionWithAddressAndPrices[]> {
  const address = await fetchAddressBySubstring(addressString)
  let newTransactionsCount = -1
  let seenTransactionsCount = 0
  let insertedTransactions: TransactionWithAddressAndPrices[] = []
  while (newTransactionsCount !== 0) {
    let nextTransactions = (await grpcService.getAddress({
      address: address.address,
      nbFetch: FETCH_N,
      nbSkip: seenTransactionsCount
    })).confirmedTransactionsList
    // remove transactions older than the networks
    nextTransactions = nextTransactions.filter((t) => {
      return (
        (t.timestamp >= XEC_TIMESTAMP_THRESHOLD && address.networkId === XEC_NETWORK_ID) ||
        (t.timestamp >= BCH_TIMESTAMP_THRESHOLD && address.networkId === BCH_NETWORK_ID)
      )
    })
    newTransactionsCount = nextTransactions.length
    seenTransactionsCount += newTransactionsCount
    const newInsertedTransactions = await upsertManyTransactions(nextTransactions, address)
    insertedTransactions = [...insertedTransactions, ...newInsertedTransactions]
    await new Promise(resolve => setTimeout(resolve, FETCH_DELAY))
  }
  return insertedTransactions
}

export async function syncTransactionsAndPricesForAddress (addressString: string): Promise<void> {
  const address = parseAddress(addressString)
  if (address === '' || address === undefined) {
    throw new Error(ADDRESS_NOT_PROVIDED_400.message)
  }
  const insertedTransactions = await syncTransactionsForAddress(address)
  await syncPricesFromTransactionList(insertedTransactions)
}

export async function syncTransactionsAndPricesForAddressList (addressStringList: string[]): Promise<void> {
  for (const addr of addressStringList) {
    void await syncTransactionsAndPricesForAddress(addr)
  }
}
