import { Transaction as BCHTransaction } from 'grpc-bchrpc-node'
import prisma from 'prisma/clientInstance'
import { Prisma, Transaction, Address } from '@prisma/client'
import grpcService from 'services/grpcService'
import { parseAddress } from 'utils/validators'
import { satoshisToUnit } from 'utils/index'
import { fetchAddressBySubstring } from 'services/addressesService'
import _ from 'lodash'
import { RESPONSE_MESSAGES } from 'constants/index'
import xecaddr from 'xecaddrjs'

const { ADDRESS_NOT_PROVIDED_400 } = RESPONSE_MESSAGES

export async function getTransactionAmount (transaction: BCHTransaction.AsObject, addressString: string): Promise<Prisma.Decimal> {
  let totalOutput = 0
  let totalInput = 0
  transaction.outputsList.forEach((output) => {
    if (addressString.includes(output.address)) {
      totalOutput += output.value
    }
  })
  transaction.inputsList.forEach((input) => {
    if (addressString.includes(input.address)) {
      totalInput += input.value
    }
  })
  const satoshis = new Prisma.Decimal(totalOutput).minus(totalInput)
  return await satoshisToUnit(
    satoshis,
    xecaddr.detectAddressFormat(addressString)
  )
}

export async function fetchAddressTransactions (addressString: string): Promise<Transaction[]> {
  const address = await fetchAddressBySubstring(addressString)
  return _.orderBy(address.transactions, ['timestamp'], ['desc'])
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

export async function upsertTransaction (transaction: BCHTransaction.AsObject, address: Address): Promise<Transaction | undefined> {
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
    create: transactionParams
  })
}

export async function upsertManyTransactions (transactions: BCHTransaction.AsObject[], address: Address): Promise<Transaction[]> {
  const ret: Transaction[] = []
  await prisma.$transaction(async (_) => {
    transactions.map(async (transaction) => {
      const t = await upsertTransaction(transaction, address)
      if (t !== undefined) {
        ret.push(t)
      }
    })
  })
  return ret
}

export async function fetchAllTransactions (addressString: string): Promise<boolean> {
  const address = await fetchAddressBySubstring(addressString)
  let newTransactionsCount = -1
  let seenTransactionsCount = 0
  while (newTransactionsCount !== 0) {
    const nextTransactions = (await grpcService.getAddress({
      address: address.address,
      nbFetch: 100,
      nbSkip: seenTransactionsCount
    })).confirmedTransactionsList
    newTransactionsCount = nextTransactions.length
    seenTransactionsCount += newTransactionsCount
    await upsertManyTransactions(nextTransactions, address)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  return true
}

export async function syncTransactions (addressString: string): Promise<void> {
  const address = parseAddress(addressString)
  if (address === '' || address === undefined) {
    throw new Error(ADDRESS_NOT_PROVIDED_400.message)
  }
  await fetchAllTransactions(address)
}
