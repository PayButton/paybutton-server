import * as addressService from 'services/addressService'
import { Prisma } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { RESPONSE_MESSAGES, NETWORK_IDS_FROM_SLUGS, BLOCKED_ADDRESSES } from 'constants/index'
import { connectAddressToUser, disconnectAddressFromUser, fetchAddressWallet } from 'services/addressesOnUserProfileService'
import { fetchUserDefaultWalletForNetwork } from './walletService'
import { CacheSet } from 'redis/index'
export interface UpdatePaybuttonInput {
  paybuttonId: string
  name?: string
  url?: string
  description?: string
  userId: string
  prefixedAddressList?: string[]
}

export interface CreatePaybuttonInput {
  userId: string
  walletId?: string
  url: string
  description: string
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

const paybuttonWithAddresses = Prisma.validator<Prisma.PaybuttonDefaultArgs>()(
  { include: includeAddresses }
)

export type PaybuttonWithAddresses = Prisma.PaybuttonGetPayload<typeof paybuttonWithAddresses>

const paybuttonWithTriggers = Prisma.validator<Prisma.PaybuttonDefaultArgs>()(
  { include: { triggers: true } }
)

export type PaybuttonWithTriggers = Prisma.PaybuttonGetPayload<typeof paybuttonWithTriggers>

async function getAddressObjectsToCreateOrConnect (prefixedAddressList: string[]): Promise<Prisma.AddressesOnButtonsUpdateManyWithoutPaybuttonNestedInput> {
  return {
    create: (await Promise.all(
      prefixedAddressList.map(
        async (addressWithPrefix) => {
          const prefix = addressWithPrefix.split(':')[0].toLowerCase()
          const networkId = NETWORK_IDS_FROM_SLUGS[prefix]
          return {
            address: addressWithPrefix.toLowerCase(),
            networkId: Number(networkId)
          }
        })
    )).map((address) => {
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

interface UpdateAddressUserConnectorsParams {
  userId: string
  addressIdListToAdd: string[]
  addressIdListToRemove: string[]
  paybuttonIdToIgnore?: string
  walletId?: string
}

async function inferWalletIdForPaybuttonNewAddress (userId: string, paybuttonId: string, newAddressId: string, addressIdListToAdd: string[]): Promise<string> {
  const paybutton = await fetchPaybuttonById(paybuttonId)
  if (paybutton.addresses.length !== 0) {
    const otherAddressConns = paybutton
      .addresses
      .filter(addr => !addressIdListToAdd.includes(addr.address.id))
    if (otherAddressConns.length > 0) {
      const firstOtherAddress = otherAddressConns[0].address
      const wallet = await fetchAddressWallet(userId, firstOtherAddress.id)
      if (wallet !== null) {
        return wallet.id
      }
    }
  }
  const address = await addressService.fetchAddressById(newAddressId)
  return (await fetchUserDefaultWalletForNetwork(userId, address.networkId)).id
}

async function updateAddressUserConnectors ({
  userId,
  addressIdListToAdd,
  addressIdListToRemove,
  paybuttonIdToIgnore,
  walletId
}: UpdateAddressUserConnectorsParams): Promise<void> {
  const otherAddressesIds = (await prisma.address.findMany({
    where: {
      paybuttons: {
        some: {
          paybutton: {
            providerUserId: userId,
            id: {
              not: paybuttonIdToIgnore
            }
          }
        }
      }
    },
    select: {
      id: true
    }
  })).map(obj => obj.id)

  // Create new or update wallet of `AddressesOnUserProfiles`
  void await Promise.all(addressIdListToAdd
    .map(async (id) => {
      // Infer wallet to other newly added addresses
      if (walletId == null) {
        if (paybuttonIdToIgnore == null) {
          walletId = undefined
        } else {
          walletId = await inferWalletIdForPaybuttonNewAddress(userId, paybuttonIdToIgnore, id, addressIdListToAdd)
        }
      }
      await connectAddressToUser(id, userId, walletId)
    })
  )
  void await Promise.all(addressIdListToRemove
    .filter((id) => !otherAddressesIds.includes(id)) // addresses that don't exist in another buttons
    .map(async (id) => {
      await disconnectAddressFromUser(id, userId)
    })
  )
}

export interface CreatePaybuttonReturn {
  paybutton: PaybuttonWithAddresses
  createdAddresses: string[]
}

export async function createPaybutton (values: CreatePaybuttonInput): Promise<CreatePaybuttonReturn> {
  // Creates or updates the `Address` objects
  // This has to be done before, or the connection
  // on relation tables to these addresses will fail
  const addressIdList: string[] = []
  const updatedAddressStringList: string[] = []
  const createdAddresses: addressService.AddressWithTransactions[] = []

  // Prevent IFP addresses from being created
  values.prefixedAddressList.forEach(address => {
    if (BLOCKED_ADDRESSES.includes(address)) { throw new Error(RESPONSE_MESSAGES.IFP_ADDRESS_NOT_SUPPORTED_400.message) }
  })

  void await Promise.all(
    values.prefixedAddressList.map(async (address) => {
      const upsertedAddress = await addressService.upsertAddress(address, prisma)
      addressIdList.push(upsertedAddress.id)
      if (upsertedAddress.createdAt.getTime() !== upsertedAddress.updatedAt.getTime()) {
        updatedAddressStringList.push(upsertedAddress.address)
      } else {
        createdAddresses.push(upsertedAddress)
      }
    })
  )
  return await prisma.$transaction(async (prisma) => {
    // Creates or updates the `addressesOnUserProfile` objects
    await updateAddressUserConnectors({
      userId: values.userId,
      addressIdListToAdd: addressIdList,
      addressIdListToRemove: [],
      paybuttonIdToIgnore: undefined,
      walletId: values.walletId
    })

    // Creates the `Paybutton`, the `AddressesOnButtons` objects
    // and connects it to the the `Address` object.
    const pb = await prisma.paybutton.create({
      data: {
        providerUserId: values.userId,
        name: values.name,
        description: values.description,
        url: values.url,
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
    await CacheSet.paybuttonCreation({
      addressStringList: updatedAddressStringList,
      paybutton: pb,
      userId: values.userId
    })
    return {
      paybutton: pb,
      createdAddresses: createdAddresses.map(addrObj => addrObj.address)
    }
  })
}

export async function deletePaybutton (values: DeletePaybuttonInput): Promise<PaybuttonWithAddresses> {
  const paybutton = await fetchPaybuttonById(values.paybuttonId)
  if (paybutton.providerUserId !== values.userId) {
    throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
  }
  const addressIdListToRemove = paybutton?.addresses.map(conn => conn.address.id) ?? []
  const deleted = await prisma.$transaction(async (prisma) => {
    // Creates or updates the `addressesOnUserProfile` objects
    await updateAddressUserConnectors({
      userId: values.userId,
      addressIdListToAdd: [],
      addressIdListToRemove,
      paybuttonIdToIgnore: values.paybuttonId
    })

    return await prisma.paybutton.delete({
      where: {
        id: values.paybuttonId
      },
      include: includeAddresses
    })
  })
  await CacheSet.paybuttonDeletion({
    addressStringList: addressIdListToRemove,
    paybutton: deleted,
    userId: values.userId
  })
  return deleted
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

export async function fetchPaybuttonWithTriggers (paybuttonId: string): Promise<PaybuttonWithTriggers> {
  return await prisma.paybutton.findUniqueOrThrow({
    where: { id: paybuttonId },
    include: {
      triggers: true
    }
  })
}

export async function fetchPaybuttonById (paybuttonId: string): Promise<PaybuttonWithAddresses> {
  return await prisma.paybutton.findUniqueOrThrow({
    where: { id: paybuttonId },
    include: includeAddresses
  })
}

export async function fetchPaybuttonArrayWithTriggersByUserId (userId: string): Promise<PaybuttonWithTriggers[]> {
  return await prisma.paybutton.findMany({
    where: { providerUserId: userId },
    include: { triggers: true }
  })
}

export async function fetchPaybuttonArrayByUserId (userId: string): Promise<PaybuttonWithAddresses[]> {
  return await prisma.paybutton.findMany({
    where: { providerUserId: userId },
    include: includeAddresses
  })
}
interface UpdatePaybuttonReturn {
  paybutton: PaybuttonWithAddresses
  createdAddresses: string[]
}

export async function updatePaybutton (params: UpdatePaybuttonInput): Promise<UpdatePaybuttonReturn> {
  const updateData: Prisma.PaybuttonUpdateInput = {}
  // Keep name, url and description if none was sent
  if (params.name !== undefined && params.name !== '') {
    updateData.name = params.name
  }
  updateData.url = params.url
  updateData.description = params.description

  // Set data to create `AddressesOnButtons` objects
  if (params.prefixedAddressList !== undefined && params.prefixedAddressList.length !== 0) {
    const addressesToCreateOrConnect = await getAddressObjectsToCreateOrConnect(params.prefixedAddressList)
    updateData.addresses = addressesToCreateOrConnect

    // Prevent IFP addresses from being created
    params.prefixedAddressList.forEach(address => {
      if (BLOCKED_ADDRESSES.includes(address)) { throw new Error(RESPONSE_MESSAGES.IFP_ADDRESS_NOT_SUPPORTED_400.message) }
    })
  }

  // List with paybuttons addresses ids, before updating
  const paybuttonOldAddressesIds = (await prisma.address.findMany({
    where: {
      paybuttons: {
        some: {
          paybuttonId: params.paybuttonId
        }
      }
    },
    select: {
      id: true
    }
  })).map(obj => obj.id)

  // Commit db update of the paybutton and `AddressesOnButtons`
  const paybutton = await prisma.$transaction(async (prisma) => {
    // remove previous address connections, if new address list sent
    if (params.prefixedAddressList !== undefined && params.prefixedAddressList.length !== 0) {
      void await prisma.addressesOnButtons.deleteMany({
        where: {
          paybuttonId: params.paybuttonId
        }
      })
    }

    return await prisma.paybutton.update({
      where: {
        id: params.paybuttonId
      },
      data: updateData,
      include: includeAddresses
    })
  })

  // List with paybuttons addresses ids, after updating
  const paybuttonNewAddresses = await prisma.address.findMany({
    where: {
      paybuttons: {
        some: {
          paybuttonId: params.paybuttonId
        }
      }
    }
  })
  const paybuttonNewAddressesIds = paybuttonNewAddresses.map(obj => obj.id)
  const addressIdListToAdd = paybuttonNewAddressesIds.filter(id => !paybuttonOldAddressesIds.includes(id))
  const addressIdListToRemove = paybuttonOldAddressesIds.filter(id => !paybuttonNewAddressesIds.includes(id))
  // Creates or updates the `addressesOnUserProfile` objects
  await updateAddressUserConnectors({
    userId: params.userId,
    addressIdListToAdd,
    addressIdListToRemove,
    paybuttonIdToIgnore: params.paybuttonId
  })

  // Get new addresses (for this button) that already exist in some
  // other button. This will be important to update the cache.
  const addressesThatAlreadyExistedStringList = (await prisma.address.findMany({
    where: {
      paybuttons: {
        some: {
          paybuttonId: {
            not: params.paybuttonId
          }
        }
      },
      id: {
        in: addressIdListToAdd
      }
    },
    select: {
      address: true
    }
  })).map(obj => obj.address)
  await CacheSet.paybuttonUpdate({
    addressStringList: addressesThatAlreadyExistedStringList,
    paybutton,
    userId: params.userId
  })
  return {
    paybutton,
    createdAddresses: paybuttonNewAddresses
      .filter(a => !addressesThatAlreadyExistedStringList.includes(a.address))
      .map(addrObj => addrObj.address)
  }
}
