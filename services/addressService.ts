import { Prisma } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { RESPONSE_MESSAGES } from 'constants/index'
import { fetchAddressTransactions } from 'services/transactionService'

const addressFullType = Prisma.validator<Prisma.AddressArgs>()({
  include: { transactions: true, network: true }
})

type AddressFullType = Prisma.AddressGetPayload<typeof addressFullType>

export async function fetchAddressBySubstring (substring: string): Promise<AddressFullType> {
  const results = await prisma.address.findMany({
    where: {
      address: {
        contains: substring
      }
    },
    include: {
      network: true,
      transactions: true
    }
  })
  if (results.length === 0) throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message)
  return results[0]
}

const addressWithTransactions = Prisma.validator<Prisma.AddressArgs>()({
  include: { transactions: true }
})

type AddressWithTransactions = Prisma.AddressGetPayload<typeof addressWithTransactions>

export async function fetchAllUserAddresses (userId: string, includeTransactions = false): Promise<AddressWithTransactions[]> {
  return await prisma.address.findMany({
    where: {
      paybuttons: {
        some: {
          paybutton: {
            providerUserId: userId
          }
        }
      }
    },
    include: {
      transactions: includeTransactions
    }
  })
}

interface AddressPaymentInfo {
  balance: Prisma.Decimal
  paymentCount: number
}

export async function getAddressPaymentInfo (addressString: string): Promise<AddressPaymentInfo> {
  const transactionsAmounts = (await fetchAddressTransactions(addressString)).map((t) => t.amount)
  const balance = transactionsAmounts.reduce((a, b) => {
    return a.plus(b)
  }, new Prisma.Decimal(0))
  const paymentCount = transactionsAmounts.length
  return {
    balance,
    paymentCount
  }
}
