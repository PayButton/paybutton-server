import { Transaction as BCHTransaction } from 'grpc-bchrpc-node'
import prisma from 'prisma/clientInstance'
import { Transaction } from '@prisma/client'
import bchdService from 'services/bchdService'
import { fetchPaybuttonAddressBySubstring } from 'services/paybuttonAddressesService'

async function getReceivedAmount (transaction: BCHTransaction.AsObject, receivingAddress: string): Promise<number> {
  let totalOutput = 0
  transaction.outputsList.forEach((output) => {
    if (output.address === receivingAddress) {
      totalOutput += output.value
    }
  })
  return totalOutput
}

export async function saveTransaction (transaction: BCHTransaction.AsObject, receivingAddress: string): Promise<Transaction | undefined> {
  const receivedAmount = await getReceivedAmount(transaction, receivingAddress)
  if (receivedAmount === 0) { // out transactions
    return
  }
  const paybuttonAddress = await fetchPaybuttonAddressBySubstring(receivingAddress)
  const transactionParams = {
    hash: transaction.hash as string,
    amount: receivedAmount.toString(),
    paybuttonAddressId: paybuttonAddress.id,
    timestamp: transaction.timestamp
  }
  return await prisma.transaction.create({ data: transactionParams })
}

export async function syncTransactions (address: string): Promise<void> {
  const transactions = await bchdService.getAddress(address)
  for (const t of transactions.confirmedTransactionsList) {
    void saveTransaction(t, address)
  }
}
