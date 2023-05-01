import * as networkService from 'services/networkService'
import * as addressService from 'services/addressService'
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

async function removePaybuttonAddressUserConnectors (paybutton: PaybuttonWithAddresses): Promise<void> {
  if (paybutton.providerUserId === null) {
    throw new Error(RESPONSE_MESSAGES.NO_USER_PROFILE_FOUND_ON_PAYBUTTON_404.message)
  }

  const userOtherPaybuttons = await prisma.paybutton.findMany({
    where: {
      id: {
        not: paybutton.id
      },
      providerUserId: paybutton.providerUserId
    },
    include: {
      addresses: {
        include: {
          address: true
        }
      }
    }
  })
  const userOtherAddressesIds = userOtherPaybuttons.map(pb => pb.addresses.map(conn => conn.address.id))
  const flattedUserOtherAddressesIds = userOtherAddressesIds.reduce((res, val) => res.concat(val), [])
  const paybuttonAddressesIds = paybutton.addresses.map(addr => addr.address.id)
  const oldAddresses = paybuttonAddressesIds.filter(id => !flattedUserOtherAddressesIds.includes(id))
  await Promise.all(oldAddresses.map(async (id) => {
    await prisma.addressesOnUserProfiles.delete({
      where: {
        userId_addressId: {
          userId: paybutton.providerUserId!,
          addressId: id
        }
      }
    })
  }))
}

async function addPaybuttonAddressUserConnectors (paybutton: PaybuttonWithAddresses, walletId?: string): Promise<void> {
  if (paybutton.providerUserId === null) {
    throw new Error(RESPONSE_MESSAGES.NO_USER_PROFILE_FOUND_ON_PAYBUTTON_404.message)
  }
  const userAddresses = await addressService.fetchAllUserAddresses(paybutton.providerUserId)
  const userAddressesIds = userAddresses.map(addr => addr.id)
  const paybuttonAddresses = paybutton.addresses.map(addr => addr.address)
  const newAddresses = paybuttonAddresses.filter(addr => !userAddressesIds.includes(addr.id))
  void await Promise.all(newAddresses.map(async (address) => {
    void await prisma.addressesOnUserProfiles.upsert({
      create: {
        walletId,
        userId: paybutton.providerUserId!,
        addressId: address.id
      },
      update: walletId !== null ? { walletId } : {},
      where: {
        userId_addressId: {
          userId: paybutton.providerUserId!,
          addressId: address.id
        }
      }
    })
  }))
}

export async function createPaybutton (values: CreatePaybuttonInput): Promise<PaybuttonWithAddresses> {
  const paybutton = await prisma.$transaction(async (prisma) => {
    // Creates or updates the `Address` objects
    const addressIdList: string[] = []
    for await (const address of values.prefixedAddressList) {
      addressIdList.push(
        (await addressService.upsertAddress(address, prisma)).id
      )
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
  await addPaybuttonAddressUserConnectors(paybutton, values.walletId)
  return paybutton
}

export async function deletePaybutton (values: DeletePaybuttonInput): Promise<PaybuttonWithAddresses> {
  const paybutton = await fetchPaybuttonById(values.paybuttonId)
  if (paybutton !== null && paybutton.providerUserId !== values.userId) {
    throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
  }
  const deletedPaybutton = await prisma.paybutton.delete({
    where: {
      id: values.paybuttonId
    },
    include: includeAddresses
  })
  void await removePaybuttonAddressUserConnectors(deletedPaybutton)
  return deletedPaybutton
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
