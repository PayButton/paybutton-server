import * as networkService from 'services/networkService'
import * as addressService from 'services/addressService'
import * as walletService from 'services/walletService'
import { Prisma } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { RESPONSE_MESSAGES } from 'constants/index'

export interface UpdatePaybuttonInput {
  name?: string
  prefixedAddressList?: string[]
}

export interface CreatePaybuttonInput {
  userId: string
  walletId?: string
  name: string
  buttonData: string
  prefixedAddressList: string[]
}

export interface DeletePaybuttonInput {
  userId: string
  paybuttonId: string
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
        return {
          address: addressWithPrefix.toLowerCase(),
          networkId: Number(network.id)
        }
      })
  )
}

export async function createPaybutton (values: CreatePaybuttonInput): Promise<PaybuttonWithAddresses> {
  return await prisma.$transaction(async (prisma) => {
    // Creates or updates the `Address` objects
    const addressIdList: string[] = []
    for await (const address of values.prefixedAddressList) {
      addressIdList.push(
        (await addressService.upsertAddress(address, prisma)).id
      )
    }

    if (values.walletId !== undefined) {
      // Connects them to the wallet
      const wallet = await walletService.fetchWalletById(values.walletId)
      void await walletService.connectAddressesToWallet(prisma, addressIdList, wallet)
    }

    // Creates the `Paybutton`, the `AddressesOnButtons` objects
    // and connects it to the the `Address` object.
    return await prisma.paybutton.create({
      data: {
        providerUserId: values.userId,
        name: values.name,
        buttonData: values.buttonData,
        addresses: {
          create: values.prefixedAddressList.map((address) => {
            return {
              address: {
                connect: {
                  address
                }
              }
            }
          })
        }
      },
      include: includeAddresses
    })
  })
}
export async function deletePaybutton (values: DeletePaybuttonInput): Promise<PaybuttonWithAddresses> {
  const paybutton = await fetchPaybuttonById(values.paybuttonId)
  if (paybutton !== null && paybutton.providerUserId !== values.userId) {
    throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
  }
  return await prisma.paybutton.delete({
    where: {
      id: values.paybuttonId
    },
    include: includeAddresses
  })
}

export async function fetchPaybuttonArrayByIds (paybuttonIdList: string[]): Promise<PaybuttonWithAddresses[]> {
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

export async function fetchPaybuttonById (paybuttonId: string): Promise<PaybuttonWithAddresses | null> {
  return await prisma.paybutton.findUnique({
    where: { id: paybuttonId },
    include: includeAddresses
  })
}

export async function fetchPaybuttonArrayByUserId (userId: string): Promise<PaybuttonWithAddresses[]> {
  return await prisma.paybutton.findMany({
    where: { providerUserId: userId },
    include: includeAddresses
  })
}

export async function updatePaybutton (paybuttonId: string, params: UpdatePaybuttonInput): Promise<PaybuttonWithAddresses> {
  const updateData: Prisma.PaybuttonUpdateInput = {}
  if (params.name !== undefined && params.name !== '') {
    updateData.name = params.name
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

  return await prisma.$transaction(async (prisma) => {
    // remove previous address connections, if new address list sent
    if (params.prefixedAddressList !== undefined && params.prefixedAddressList.length !== 0) {
      void await prisma.addressesOnButtons.deleteMany({
        where: {
          paybuttonId
        }
      })
    }
    return await prisma.paybutton.update({
      where: {
        id: paybuttonId
      },
      data: updateData,
      include: includeAddresses
    })
  })
}
