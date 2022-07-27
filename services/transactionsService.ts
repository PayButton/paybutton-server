import { Transaction as BCHTransaction } from 'grpc-bchrpc-node'
import prisma from 'prisma/clientInstance'
import { Prisma, Transaction } from '@prisma/client'
import bchdService from 'services/bchdService'
import { fetchAddressBySubstring } from 'services/addressesService'
import _ from 'lodash'

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
  return new Prisma.Decimal(totalOutput).minus(totalInput).dividedBy(1e8)
}

export async function fetchAddressTransactions (addressString: string): Promise<Transaction[]> {
  const address = await fetchAddressBySubstring(addressString)
  return _.orderBy(address.receivedTransactions, ['timestamp'], ['desc'])
}

export async function upsertTransaction (transaction: BCHTransaction.AsObject, addressString: string): Promise<Transaction | undefined> {
  const receivedAmount = await getTransactionAmount(transaction, addressString)
  if (receivedAmount === new Prisma.Decimal(0)) { // out transactions
    return
  }
  const address = await fetchAddressBySubstring(addressString)
  const transactionParams = {
    hash: transaction.hash as string,
    amount: receivedAmount,
    addressId: address.id,
    timestamp: transaction.timestamp
  }
  return await prisma.transaction.upsert({
    where: {
      hash: transactionParams.hash
    },
    update: transactionParams,
    create: transactionParams
  })
}

export async function syncTransactions (address: string): Promise<void> {
  const transactions = await bchdService.getAddress(address)
  for (const t of transactions.confirmedTransactionsList) {
    void upsertTransaction(t, address)
  }
}
