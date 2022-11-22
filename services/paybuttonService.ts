import * as networkService from 'services/networkService'
import { Prisma } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { RESPONSE_MESSAGES } from 'constants/index'

export interface UpdatePaybuttonInput {
  name?: string
  buttonData?: string
  prefixedAddressList?: string[]
}

export interface CreatePaybuttonInput {
  userId: string
  name: string
  buttonData: string
  prefixedAddressList: string[]
}

export interface DeletePaybuttonInput {
  userId: string
  paybuttonId: number | string
}

const includeAddresses = {
  addresses: {
    select: {
      address: true
    }
  }
}

const paybuttonWithAddresses = Prisma.validator<Prisma.PaybuttonArgs>()(
  { include: includeAddresses }
)

export type PaybuttonWithAddresses = Prisma.PaybuttonGetPayload<typeof paybuttonWithAddresses>

async function getAddressObjectsToCreateOrConnect (prefixedAddressList: string[]): Promise<Prisma.AddressUncheckedCreateWithoutPaybuttonsInput[]> {
  return await Promise.all(
    prefixedAddressList.map(
      async (addressWithPrefix) => {
        const prefix = addressWithPrefix.split(':')[0].toLowerCase()
        const network = await networkService.getNetworkFromSlug(prefix)
        if (network === null) throw new Error(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.message)
        return {
          address: addressWithPrefix.toLowerCase(),
          networkId: Number(network.id)
        }
      })
  )
}

export async function createPaybutton (values: CreatePaybuttonInput): Promise<PaybuttonWithAddresses> {
  const addressesToCreateOrConnect = await getAddressObjectsToCreateOrConnect(values.prefixedAddressList)
  return await prisma.paybutton.create({
    data: {
      providerUserId: values.userId,
      name: values.name,
      buttonData: values.buttonData,
      addresses: {
        create: addressesToCreateOrConnect.map((address) => {
          return {
            address: {
              connectOrCreate: {
                where: { address: address.address },
                create: address
              }
            }
          }
        })
      }
    },
    include: includeAddresses
  })
}
export async function deletePaybutton (values: DeletePaybuttonInput): Promise<PaybuttonWithAddresses> {
  const paybutton = await fetchPaybuttonById(values.paybuttonId)
  if (paybutton !== null && paybutton.providerUserId !== values.userId) {
    throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
  }
  return await prisma.paybutton.delete({
    where: {
      id: Number(values.paybuttonId)
    },
    include: includeAddresses
  })
}

export async function fetchPaybuttonArrayByIds (paybuttonIdList: number[]): Promise<PaybuttonWithAddresses[]> {
  const paybuttonArray = await prisma.paybutton.findMany({
    where: {
      id: {
        in: paybuttonIdList
      }
    },
    include: includeAddresses
  })
  if (paybuttonIdList.length !== paybuttonArray.length) {
    throw new Error(RESPONSE_MESSAGES.NO_BUTTON_FOUND_404.message)
  }
  return paybuttonArray
}

export async function fetchPaybuttonById (paybuttonId: number | string): Promise<PaybuttonWithAddresses | null> {
  return await prisma.paybutton.findUnique({
    where: { id: Number(paybuttonId) },
    include: includeAddresses
  })
}

export async function fetchPaybuttonArrayByUserId (userId: string): Promise<PaybuttonWithAddresses[]> {
  return await prisma.paybutton.findMany({
    where: { providerUserId: userId },
    include: includeAddresses
  })
}

export async function updatePaybutton (paybuttonId: number, params: UpdatePaybuttonInput): Promise<PaybuttonWithAddresses> {
  const updateData: Prisma.PaybuttonUpdateInput = {
    name: params.name,
    buttonData: params.buttonData
  }
  if (params.prefixedAddressList !== undefined && params.prefixedAddressList.length !== 0) {
    const addressesToCreateOrConnect = await getAddressObjectsToCreateOrConnect(params.prefixedAddressList)
    updateData.addresses = {
      create: addressesToCreateOrConnect.map((address) => {
        return {
          address: {
            connectOrCreate: {
              where: { address: address.address },
              create: address
            }
          }
        }
      })
    }
  }

  return await prisma.paybutton.update({
    where: {
      id: paybuttonId
    },
    data: updateData,
    include: includeAddresses
  })
}
