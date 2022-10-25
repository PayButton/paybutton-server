// import * as networkService from 'services/networkService'
import * as paybuttonService from 'services/paybuttonService'
import * as addressService from 'services/addressService'
import { Prisma, Wallet } from '@prisma/client'
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

export type WalletWithAddressesAndPaybuttons = Prisma.WalletGetPayload<typeof walletWithAddressesAndPaybuttons>

export async function createWallet (values: CreateWalletInput): Promise<Wallet> {
  const paybuttonList = await paybuttonService.fetchPaybuttonArrayByIds(values.paybuttonIdList)
  let wallet: Wallet
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

      await prisma.paybutton.update({
        data: {
          walletId: wallet.id
        },
        where: {
          id: paybutton.id
        }
      })
      for (const connector of paybutton.addresses) {
        if (connector.address.walletId !== null) {
          throw new Error(RESPONSE_MESSAGES.ADDRESS_ALREADY_BELONGS_TO_WALLET_400.message)
        }
        await prisma.address.update({
          data: {
            walletId: wallet.id
          },
          where: {
            id: connector.address.id
          }
        })
      }
    }
    return wallet
  })
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
    if (!wallet.addresses.some((addr) => addr.networkId === XEC_NETWORK_ID)) {
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
  } else if (wallet.userProfile.isXECDefault === true) {
    // unset default for XEC
    await prisma.walletsOnUserProfile.update({
      where: {
        walletId: wallet.id
      },
      data: {
        isXECDefault: null
      }
    })
    wallet.userProfile.isXECDefault = null
  }
  if (networkIds.includes(BCH_NETWORK_ID)) {
    if (!wallet.addresses.some((addr) => addr.networkId === BCH_NETWORK_ID)) {
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
  } else if (wallet.userProfile.isBCHDefault === true) {
    // unset default for BCH
    await prisma.walletsOnUserProfile.update({
      where: {
        walletId: wallet.id
      },
      data: {
        isBCHDefault: null
      }
    })
    wallet.userProfile.isBCHDefault = null
  }
  return wallet
}

export async function updateWallet (walletId: number, params: any): Promise<WalletWithAddressesAndPaybuttons> {
  const paybuttonList = await paybuttonService.fetchPaybuttonArrayByIds(params.paybuttonIdList.map((id: string) => Number(id)))

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

  const wallet = await fetchWalletById(walletId)
  if (wallet === null) {
    throw new Error(RESPONSE_MESSAGES.NO_WALLET_FOUND_404.message)
  }
  if (wallet.userProfile === null) {
    throw new Error(RESPONSE_MESSAGES.NO_USER_PROFILE_FOUND_ON_WALLET_404.message)
  }
  // set default for XEC
  const defaultForNetworkIds: number[] = []
  if (params.isXECDefault === true) {
    defaultForNetworkIds.push(XEC_NETWORK_ID)
  }

  // set default for BCH
  if (params.isBCHDefault === true) {
    defaultForNetworkIds.push(BCH_NETWORK_ID)
  }

  return await prisma.$transaction(async (prisma) => {
    const updatedWallet = await setDefaultWallet(wallet, defaultForNetworkIds)
    // wip: update paybuttons
    // wip: update wallet name
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
