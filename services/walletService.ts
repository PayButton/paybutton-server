// import * as networkService from 'services/networkService'
import * as paybuttonService from 'services/paybuttonService'
import * as addressService from 'services/addressService'
import { Prisma } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { RESPONSE_MESSAGES, XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'

export interface CreateWalletInput {
  userId: string
  name: string
  paybuttonIdList: number[]
}

export interface UpdateWalletInput {
  name: string
  isXECDefault?: boolean
  isBCHDefault?: boolean
  paybuttonIdList: number[]
}

const includeAddressesAndPaybuttons = {
  userProfile: {
    select: {
      userProfileId: true,
      isXECDefault: true,
      isBCHDefault: true
    }
  },
  paybuttons: true,
  addresses: {
    select: {
      id: true,
      address: true,
      networkId: true
    }
  }
}

const walletWithAddressesAndPaybuttons = Prisma.validator<Prisma.WalletArgs>()(
  { include: includeAddressesAndPaybuttons }
)

const getDefaultForNetworkIds = (isXECDefault: boolean | undefined, isBCHDefault: boolean | undefined): number[] => {
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

const walletHasAddressForNetwork = (wallet: WalletWithAddressesAndPaybuttons, networkId: number): boolean => {
  if (wallet.addresses.every((addr) => addr.networkId !== networkId)) {
    return false
  }
  return true
}

export type WalletWithAddressesAndPaybuttons = Prisma.WalletGetPayload<typeof walletWithAddressesAndPaybuttons>

export async function createWallet (values: CreateWalletInput): Promise<WalletWithAddressesAndPaybuttons> {
  const paybuttonList = await paybuttonService.fetchPaybuttonArrayByIds(values.paybuttonIdList)
  let wallet: WalletWithAddressesAndPaybuttons
  return await prisma.$transaction(async (prisma) => {
    wallet = await prisma.wallet.create({
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
      include: includeAddressesAndPaybuttons
    })
    for (const paybutton of paybuttonList) {
      if (paybutton.walletId !== null) {
        throw new Error(RESPONSE_MESSAGES.PAYBUTTON_ALREADY_BELONGS_TO_WALLET_400.message)
      }
      if (paybutton.providerUserId !== values.userId) {
        throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
      }

      const updatedPaybutton = await prisma.paybutton.update({
        data: {
          walletId: wallet.id
        },
        where: {
          id: paybutton.id
        }
      })
      wallet.paybuttons.push(updatedPaybutton)
      for (const connector of paybutton.addresses) {
        if (connector.address.walletId !== null) {
          throw new Error(RESPONSE_MESSAGES.ADDRESS_ALREADY_BELONGS_TO_WALLET_400.message)
        }
        const updatedAddress = await prisma.address.update({
          data: {
            walletId: wallet.id
          },
          where: {
            id: connector.address.id
          }
        })
        wallet.addresses.push({
          id: updatedAddress.id,
          address: updatedAddress.address,
          networkId: updatedAddress.networkId
        })
      }
    }
    return wallet
  })
}

export async function createDefaultWalletForUser (userId: string): Promise<WalletWithAddressesAndPaybuttons> {
  const wallet = await createWallet({
    userId,
    name: 'Default Wallet',
    paybuttonIdList: []
  })
  await setDefaultWallet(wallet, [XEC_NETWORK_ID, BCH_NETWORK_ID])
  return wallet
}

export async function fetchWalletById (walletId: number | string): Promise<WalletWithAddressesAndPaybuttons | null> {
  return await prisma.wallet.findUnique({
    where: { id: Number(walletId) },
    include: includeAddressesAndPaybuttons
  })
}

export async function setDefaultWallet (wallet: WalletWithAddressesAndPaybuttons, networkIds: number[]): Promise<WalletWithAddressesAndPaybuttons> {
  if (wallet.userProfile === null) {
    throw new Error(RESPONSE_MESSAGES.NO_USER_PROFILE_FOUND_ON_WALLET_404.message)
  }
  if (networkIds.includes(XEC_NETWORK_ID)) {
    if (!walletHasAddressForNetwork(wallet, XEC_NETWORK_ID)) {
      throw new Error(RESPONSE_MESSAGES.DEFAULT_XEC_WALLET_MUST_HAVE_SOME_XEC_ADDRESS_400.message)
    }
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
    if (!walletHasAddressForNetwork(wallet, BCH_NETWORK_ID)) {
      throw new Error(RESPONSE_MESSAGES.DEFAULT_BCH_WALLET_MUST_HAVE_SOME_BCH_ADDRESS_400.message)
    }

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

export async function updateWallet (walletId: number, params: UpdateWalletInput): Promise<WalletWithAddressesAndPaybuttons> {
  const wallet = await fetchWalletById(walletId)
  if (wallet === null) {
    throw new Error(RESPONSE_MESSAGES.NO_WALLET_FOUND_404.message)
  }

  const paybuttonList = await paybuttonService.fetchPaybuttonArrayByIds(params.paybuttonIdList)

  // enforce that added paybuttons & addresses don't already belong to a wallet
  paybuttonList.forEach((pb) => {
    if (pb.walletId !== null && pb.walletId !== walletId) {
      throw new Error(RESPONSE_MESSAGES.PAYBUTTON_ALREADY_BELONGS_TO_WALLET_400.message)
    }
    pb.addresses.forEach((conn) => {
      if (conn.address.walletId !== null && conn.address.walletId !== walletId) {
        throw new Error(RESPONSE_MESSAGES.ADDRESS_ALREADY_BELONGS_TO_WALLET_400.message)
      }
    })
  })
  if (wallet.userProfile === null) {
    throw new Error(RESPONSE_MESSAGES.NO_USER_PROFILE_FOUND_ON_WALLET_404.message)
  }

  const defaultForNetworkIds = getDefaultForNetworkIds(params.isXECDefault, params.isBCHDefault)

  if (params.name === '' || params.name === undefined) throw new Error(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
  return await prisma.$transaction(async (prisma) => {
    let updatedWallet = await prisma.wallet.update({
      where: {
        id: wallet.id
      },
      data: {
        name: params.name
      },
      include: includeAddressesAndPaybuttons
    })
    updatedWallet = await setDefaultWallet(updatedWallet, defaultForNetworkIds)
    // wip: update paybuttons
    return updatedWallet
  })
}

export interface WalletPaymentInfo {
  XECBalance: Prisma.Decimal
  BCHBalance: Prisma.Decimal
  paymentCount: number
}

export async function getWalletBalance (wallet: WalletWithAddressesAndPaybuttons): Promise<WalletPaymentInfo> {
  const ret: WalletPaymentInfo = {
    XECBalance: new Prisma.Decimal(0),
    BCHBalance: new Prisma.Decimal(0),
    paymentCount: 0
  }
  for (const addr of wallet.addresses) {
    const addrBalance = await addressService.getAddressPaymentInfo(addr.address)
    if (addr.networkId === XEC_NETWORK_ID) {
      ret.XECBalance = ret.XECBalance.plus(addrBalance.balance)
    }
    if (addr.networkId === BCH_NETWORK_ID) {
      ret.BCHBalance = ret.BCHBalance.plus(addrBalance.balance)
    }
    ret.paymentCount += addrBalance.paymentCount
  }
  return ret
}

export async function fetchWalletArrayByUserId (userId: string): Promise<WalletWithAddressesAndPaybuttons[]> {
  return await prisma.wallet.findMany({
    where: { providerUserId: userId },
    include: includeAddressesAndPaybuttons
  })
}
