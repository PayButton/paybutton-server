import { Transaction as BCHTransaction } from 'grpc-bchrpc-node'
import prisma from 'prisma/clientInstance'
import { Prisma, Transaction } from '@prisma/client'
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

export async function upsertTransaction (transaction: BCHTransaction.AsObject, addressString: string): Promise<Transaction | undefined> {
  const receivedAmount = await getTransactionAmount(transaction, addressString)
  if (receivedAmount === new Prisma.Decimal(0)) { // out transactions
    return
  }
  const address = await fetchAddressBySubstring(addressString)
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

export async function getAllTransactions (addressString: string): Promise<void> {
  let newTransactionsCount = -1
  let totalFetched = 0
  while (newTransactionsCount !== 0) {
    const nextTransactions = (await grpcService.getAddress({
      address: addressString,
      nbFetch: 50,
      nbSkip: totalFetched
    })).confirmedTransactionsList
    newTransactionsCount = nextTransactions.length
    totalFetched += newTransactionsCount
  }
}

export async function syncTransactions (addressString: string): Promise<void> {
  const address = parseAddress(addressString)
  if (address === '' || address === undefined) {
    throw new Error(ADDRESS_NOT_PROVIDED_400.message)
  }
  const transactions = await grpcService.getAddress({ address })
  for (const t of transactions.confirmedTransactionsList) {
    void upsertTransaction(t, address)
  }
}
