import { Prisma } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { RESPONSE_MESSAGES } from 'constants/index'

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
