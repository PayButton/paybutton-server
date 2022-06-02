import * as chainService from 'services/chainsService'
import { Paybutton, Prisma } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { RESPONSE_MESSAGES } from 'constants/index'

export async function createPaybutton (userId: string, prefixedAddressList: string[]): Promise<Paybutton> {
  const paybuttonAddressesToCreate: Prisma.PaybuttonAddressUncheckedCreateWithoutPaybuttonsInput[] = await Promise.all(
    prefixedAddressList.map(
      async (addressWithPrefix) => {
        const [prefix, address] = addressWithPrefix.split(':').map(
          (substring) => substring.toLowerCase()
        )
        const chain = await chainService.getChainFromSlug(prefix)
        if (chain === null) throw new Error(RESPONSE_MESSAGES.INVALID_CHAIN_SLUG_400.message)
        return {
          address: address.toLowerCase(),
          chainId: Number(chain.id)
        }
      })
  )
  return await prisma.paybutton.create({
    data: {
      providerUserId: userId,
      paybuttonAddresses: {
        create: paybuttonAddressesToCreate
      }
    },
    include: { paybuttonAddresses: true }
  })
}

export async function fetchPaybuttonById (paybuttonId: number | string): Promise<Paybutton | null> {
  return await prisma.paybutton.findUnique({
    where: { id: Number(paybuttonId) },
    include: { paybuttonAddresses: true }
  })
}

export async function fetchPaybuttonArrayByUserId (userId: string): Promise<Paybutton[]> {
  return await prisma.paybutton.findMany({
    where: { providerUserId: userId },
    include: { paybuttonAddresses: true }
  })
}
