import { PaybuttonAddress } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { RESPONSE_MESSAGES } from 'constants/index'

export async function fetchPaybuttonAddressesBySubstring (substring: string): Promise<PaybuttonAddress> {
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
  return results
}
