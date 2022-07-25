import { Prisma } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { RESPONSE_MESSAGES } from 'constants/index'

const paybuttonAddressFullType = Prisma.validator<Prisma.PaybuttonAddressArgs>()({
  include: { receivedTransactions: true, chain: true }
})

type PaybuttonAddressFullType = Prisma.PaybuttonAddressGetPayload<typeof paybuttonAddressFullType>

export async function fetchPaybuttonAddressBySubstring (substring: string): Promise<PaybuttonAddressFullType> {
  const results = await prisma.paybuttonAddress.findMany({
    where: {
      address: {
        contains: substring
      }
    },
    include: {
      chain: true,
      receivedTransactions: true
    }
  })
  if (results.length === 0) throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message)
  return results[0]
}
