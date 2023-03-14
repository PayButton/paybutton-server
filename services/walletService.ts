import * as addressService from 'services/addressService'
import { Prisma, WalletsOnUserProfile } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { RESPONSE_MESSAGES, XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'

export interface CreateWalletInput {
  userId: string
  name: string
  isXECDefault?: boolean
  isBCHDefault?: boolean
  addressIdList: number[]
}

export interface UpdateWalletInput {
  name: string
  isXECDefault?: boolean
  isBCHDefault?: boolean
  addressIdList: number[]
  userId: string
}

export interface DeleteWalletInput {
  userId: string
  walletId: number | string
}

const includeAddressesWithPaybuttons = {
  userProfile: {
    select: {
      userProfileId: true,
      isXECDefault: true,
      isBCHDefault: true
    }
  },
  userAddresses: {
    include: {
      address: {
        include: {
          paybuttons: addressService.includePaybuttonsNested.paybuttons
        }
      }
    }
  }
}

const walletWithAddressesWithPaybuttons = Prisma.validator<Prisma.WalletArgs>()({
  include: includeAddressesWithPaybuttons
})
export type WalletWithAddressesWithPaybuttons = Prisma.WalletGetPayload<typeof walletWithAddressesWithPaybuttons>

function filterOutOtherUsersPaybuttons (wallet: WalletWithAddressesWithPaybuttons): void {
  for (const addr of wallet.userAddresses) {
    addr.address.paybuttons = addr.address.paybuttons.filter((conn) => conn.paybutton.providerUserId === wallet.providerUserId)
  }
}

export const getDefaultForNetworkIds = (isXECDefault: boolean | undefined, isBCHDefault: boolean | undefined): number[] => {
  const defaultForNetworkIds: number[] = []
  // set default for XEC
  if (isXECDefault === true) {
    defaultForNetworkIds.push(XEC_NETWORK_ID)
  }

  // set default for BCH
  if (isBCHDefault === true) {
    defaultForNetworkIds.push(BCH_NETWORK_ID)
  }
  return defaultForNetworkIds
}

export const walletHasAddressForNetwork = (wallet: WalletWithAddressesWithPaybuttons, networkId: number): boolean => {
  if (wallet.userAddresses.every((addr) => addr.address.networkId !== networkId)) {
    return false
  }
  return true
}

async function removeAddressesFromWallet (
  prisma: Prisma.TransactionClient,
  wallet: WalletWithAddressesWithPaybuttons,
  addressIdsToRemoveList: number[]
): Promise<void> {
  if (wallet.userProfile === null) {
    throw new Error(RESPONSE_MESSAGES.NO_USER_PROFILE_FOUND_ON_WALLET_404.message)
  }
  for (const addressId of addressIdsToRemoveList) {
    await prisma.addressesOnUserProfiles.update({
      data: {
        walletId: null
      },
      where: {
        userProfileId_addressId: {
          userProfileId: wallet.userProfile.userProfileId,
          addressId
        }
      }
    })
  }
}

export async function connectAddressesToWallet (
  prisma: Prisma.TransactionClient,
  addressIdList: number[],
  wallet: WalletWithAddressesWithPaybuttons
): Promise<void> {
  if (wallet.userProfile === null) {
    throw new Error(RESPONSE_MESSAGES.NO_USER_PROFILE_FOUND_ON_WALLET_404.message)
  }
  for (const addressId of addressIdList) {
    const addr = await prisma.address.findUnique({ where: { id: addressId } })
    if (addr === null) {
      throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message)
    }
    await prisma.addressesOnUserProfiles.upsert({
      create: {
        walletId: wallet.id,
        userProfileId: wallet.userProfile.userProfileId,
        addressId
      },
      update: {
        walletId: wallet.id
      },
      where: {
        userProfileId_addressId: {
          userProfileId: wallet.userProfile.userProfileId,
          addressId
        }
      }
    })
  }
}

export async function setAddressListForWallet (
  prisma: Prisma.TransactionClient,
  addressIdList: number[],
  wallet: WalletWithAddressesWithPaybuttons
): Promise<void> {
  await connectAddressesToWallet(prisma, addressIdList, wallet)

  // remove addresses that are not on the list
  await removeAddressesFromWallet(
    prisma,
    wallet,
    wallet.userAddresses.map(addr => addr.address.id).filter(addrId => !addressIdList.includes(addrId))
  )
}

export async function createWallet (values: CreateWalletInput): Promise<WalletWithAddressesWithPaybuttons> {
  const defaultForNetworkIds = getDefaultForNetworkIds(values.isXECDefault, values.isBCHDefault)
  const newWalletId: number = await prisma.$transaction(async (prisma) => {
    const w = await prisma.wallet.create({
      data: {
        providerUserId: values.userId,
        name: values.name,
        userProfile: {
          create: {
            userProfile: {
              connectOrCreate: {
                where: {
                  userId: values.userId
                },
                create: {
                  userId: values.userId
                }
              }
            }
          }
        }
      },
      include: includeAddressesWithPaybuttons
    })
    await setAddressListForWallet(prisma, values.addressIdList, w)
    return w.id
  })
  return await setDefaultWallet(
    await fetchWalletById(newWalletId),
    defaultForNetworkIds
  )
}

export async function createDefaultWalletForUser (userId: string): Promise<WalletWithAddressesWithPaybuttons> {
  const wallet = await createWallet({
    userId,
    name: 'Default Wallet',
    addressIdList: []
  })
  await setDefaultWallet(wallet, [XEC_NETWORK_ID, BCH_NETWORK_ID])
  return wallet
}

export async function fetchWalletById (walletId: number | string): Promise<WalletWithAddressesWithPaybuttons> {
  const wallet = await prisma.wallet.findUnique({
    where: { id: Number(walletId) },
    include: includeAddressesWithPaybuttons
  })
  if (wallet === null) {
    throw new Error(RESPONSE_MESSAGES.NO_WALLET_FOUND_404.message)
  }
  filterOutOtherUsersPaybuttons(wallet)
  return wallet
}

export async function setDefaultWallet (wallet: WalletWithAddressesWithPaybuttons, networkIds: number[]): Promise<WalletWithAddressesWithPaybuttons> {
  if (wallet.userProfile === null) {
    throw new Error(RESPONSE_MESSAGES.NO_USER_PROFILE_FOUND_ON_WALLET_404.message)
  }
  if (networkIds.includes(XEC_NETWORK_ID)) {
    // see if any wallet is already the default
    const prevXECDefault = await prisma.walletsOnUserProfile.findUnique({
      where: {
        WalletsOnUserProfile_userProfileId_isXECDefault_unique_constraint: {
          isXECDefault: true,
          userProfileId: wallet.userProfile.userProfileId
        }
      }
    })
    await prisma.$transaction(async (prisma) => {
      if (wallet.userProfile === null) {
        throw new Error(RESPONSE_MESSAGES.NO_USER_PROFILE_FOUND_ON_WALLET_404.message)
      }
      // remove previous default if it exists
      if (prevXECDefault !== null) {
        await prisma.walletsOnUserProfile.update({
          where: {
            walletId: prevXECDefault.walletId
          },
          data: {
            isXECDefault: null
          }
        })
      }

      // set new default
      await prisma.walletsOnUserProfile.update({
        where: {
          walletId: wallet.id
        },
        data: {
          isXECDefault: true
        }
      })
      wallet.userProfile.isXECDefault = true
    })
  }
  if (networkIds.includes(BCH_NETWORK_ID)) {
    // see if any wallet is already the default
    const prevBCHDefault = await prisma.walletsOnUserProfile.findUnique({
      where: {
        WalletsOnUserProfile_userProfileId_isBCHDefault_unique_constraint: {
          isBCHDefault: true,
          userProfileId: wallet.userProfile.userProfileId
        }
      }
    })
    await prisma.$transaction(async (prisma) => {
      if (wallet.userProfile === null) {
        throw new Error(RESPONSE_MESSAGES.NO_USER_PROFILE_FOUND_ON_WALLET_404.message)
      }
      // remove previous default if it exists
      if (prevBCHDefault !== null) {
        await prisma.walletsOnUserProfile.update({
          where: {
            walletId: prevBCHDefault.walletId
          },
          data: {
            isBCHDefault: null
          }
        })
      }
      // set new default
      await prisma.walletsOnUserProfile.update({
        where: {
          walletId: wallet.id
        },
        data: {
          isBCHDefault: true
        }
      })
      wallet.userProfile.isBCHDefault = true
    })
  }
  return wallet
}

export async function updateWallet (walletId: number, params: UpdateWalletInput): Promise<WalletWithAddressesWithPaybuttons> {
  const wallet = await fetchWalletById(walletId)

  if (wallet.userProfile === null) {
    throw new Error(RESPONSE_MESSAGES.NO_USER_PROFILE_FOUND_ON_WALLET_404.message)
  }

  const defaultForNetworkIds = getDefaultForNetworkIds(params.isXECDefault, params.isBCHDefault)

  if (params.name === '' || params.name === undefined) throw new Error(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
  await prisma.$transaction(async (prisma) => {
    const updatedWallet = await prisma.wallet.update({
      where: {
        id: wallet.id
      },
      data: {
        name: params.name
      },
      include: includeAddressesWithPaybuttons
    })
    await setAddressListForWallet(prisma, params.addressIdList, updatedWallet)
    return updatedWallet
  })
  return await setDefaultWallet(
    await fetchWalletById(walletId),
    defaultForNetworkIds
  )
}

export interface WalletPaymentInfo {
  XECBalance: Prisma.Decimal
  BCHBalance: Prisma.Decimal
  paymentCount: number
}

export interface WalletWithPaymentInfo {
  wallet: WalletWithAddressesWithPaybuttons
  paymentInfo: WalletPaymentInfo
}

export async function getWalletBalance (wallet: WalletWithAddressesWithPaybuttons): Promise<WalletPaymentInfo> {
  const ret: WalletPaymentInfo = {
    XECBalance: new Prisma.Decimal(0),
    BCHBalance: new Prisma.Decimal(0),
    paymentCount: 0
  }
  for (const addr of wallet.userAddresses) {
    const addrBalance = await addressService.getAddressPaymentInfo(addr.address.address)
    if (addr.address.networkId === XEC_NETWORK_ID) {
      ret.XECBalance = ret.XECBalance.plus(addrBalance.balance)
    }
    if (addr.address.networkId === BCH_NETWORK_ID) {
      ret.BCHBalance = ret.BCHBalance.plus(addrBalance.balance)
    }
    ret.paymentCount += addrBalance.paymentCount
  }
  return ret
}

export async function getUserDefaultWalletForNetworkId (userProfileId: number, networkId: number): Promise<WalletWithAddressesWithPaybuttons> {
  let userWalletProfile: WalletsOnUserProfile | null
  if (networkId === BCH_NETWORK_ID) {
    userWalletProfile = await prisma.walletsOnUserProfile.findUnique({
      where: {
        WalletsOnUserProfile_userProfileId_isBCHDefault_unique_constraint: {
          userProfileId,
          isBCHDefault: true
        }
      }
    })
  } else if (networkId === XEC_NETWORK_ID) {
    userWalletProfile = await prisma.walletsOnUserProfile.findUnique({
      where: {
        WalletsOnUserProfile_userProfileId_isXECDefault_unique_constraint: {
          userProfileId,
          isXECDefault: true
        }
      }
    })
  } else {
    throw new Error(RESPONSE_MESSAGES.INVALID_NETWORK_ID_400.message)
  }

  if (userWalletProfile === null) {
    throw new Error(RESPONSE_MESSAGES.USER_PROFILE_NOT_FOUND_400.message)
  }
  return await fetchWalletById(userWalletProfile.walletId)
}

export async function moveAddressesToDefaultWallet (wallet: WalletWithAddressesWithPaybuttons): Promise<void> {
  if (wallet.userProfile === null) {
    throw new Error(RESPONSE_MESSAGES.NO_USER_PROFILE_FOUND_ON_WALLET_404.message)
  }
  const XECDefaultWallet = await getUserDefaultWalletForNetworkId(wallet.userProfile?.userProfileId, XEC_NETWORK_ID)
  const BCHDefaultWallet = await getUserDefaultWalletForNetworkId(wallet.userProfile?.userProfileId, BCH_NETWORK_ID)
  for (const addr of wallet.userAddresses) {
    // Get id of default wallet to move
    let defaultWalletId: number
    if (addr.address.networkId === BCH_NETWORK_ID) {
      defaultWalletId = BCHDefaultWallet.id
    } else if (addr.address.networkId === XEC_NETWORK_ID) {
      defaultWalletId = XECDefaultWallet.id
    } else {
      throw new Error(RESPONSE_MESSAGES.INVALID_NETWORK_ID_400.message)
    }

    await prisma.addressesOnUserProfiles.update({
      data: {
        walletId: defaultWalletId
      },
      where: {
        userProfileId_addressId: {
          userProfileId: wallet.userProfile.userProfileId,
          addressId: addr.addressId
        }
      }
    })
  }
}

export async function deleteWallet (params: DeleteWalletInput): Promise<WalletWithAddressesWithPaybuttons> {
  const wallet = await fetchWalletById(params.walletId)
  if (wallet !== null && wallet.providerUserId !== params.userId) {
    throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
  }
  if (wallet.userProfile?.isBCHDefault === true || wallet.userProfile?.isXECDefault === true) {
    throw new Error(RESPONSE_MESSAGES.DEFAULT_WALLET_CANNOT_BE_DELETED_400.message)
  }
  return await prisma.$transaction(async (prisma) => {
    await moveAddressesToDefaultWallet(wallet)
    const w = await prisma.wallet.delete({
      where: {
        id: Number(params.walletId)
      },
      include: includeAddressesWithPaybuttons
    })
    filterOutOtherUsersPaybuttons(w)
    return w
  })
}

export async function fetchWalletArrayByUserId (userId: string): Promise<WalletWithAddressesWithPaybuttons[]> {
  const walletList = await prisma.wallet.findMany({
    where: { providerUserId: userId },
    include: includeAddressesWithPaybuttons
  })
  walletList.forEach((w) => filterOutOtherUsersPaybuttons(w))
  return walletList
}
