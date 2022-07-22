import { PaybuttonAddress } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { RESPONSE_MESSAGES } from 'constants/index'

export async function fetchPaybuttonAddressBySubstring (substring: string): Promise<PaybuttonAddress> {
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
  if (results.length > 1) throw new Error(RESPONSE_MESSAGES.MULTIPLE_ADDRESSES_FOUND_400.message)
  if (results.length === 0) throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message)
  return results[0]
}
