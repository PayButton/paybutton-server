import * as chainService from 'services/chainsService'
import { Paybutton, Prisma } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { RESPONSE_MESSAGES } from 'constants/index'
import { v4 as uuidv4 } from 'uuid'

const addUUID = async function (paybuttonId: number): Promise<void> {
  await prisma.$executeRaw`UPDATE Paybutton SET uuid=${uuidv4()} WHERE id=${paybuttonId}`
}

export async function createPaybutton (userId: string, name: string, prefixedAddressList: string[]): Promise<Paybutton> {
  const paybuttonAddressesToCreate: Prisma.PaybuttonAddressUncheckedCreateWithoutPaybuttonInput[] = await Promise.all(
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
  const paybutton = await prisma.paybutton.create({
    data: {
      providerUserId: userId,
      name: name,
      addresses: {
        create: paybuttonAddressesToCreate
      }
    },
    include: { addresses: true }
  })
  void addUUID(paybutton.id)
  return paybutton
}

export async function fetchPaybuttonById (paybuttonId: number | string): Promise<Paybutton | null> {
  return await prisma.paybutton.findUnique({
    where: { id: Number(paybuttonId) },
    include: { addresses: true }
  })
}

export async function fetchPaybuttonArrayByUserId (userId: string): Promise<Paybutton[]> {
  return await prisma.paybutton.findMany({
    where: { providerUserId: userId },
    include: { addresses: true }
  })
}
