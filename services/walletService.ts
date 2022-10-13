// import * as networkService from 'services/networkService'
import * as paybuttonService from 'services/paybuttonService'
import * as addressService from 'services/addressService'
import { Prisma, Wallet } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { RESPONSE_MESSAGES } from 'constants/index'

export interface CreateWalletInput {
  userId: string
  name: string
  paybuttonIdList: number[]
}

const includeAddressesAndPaybuttons = {
  userProfile: {
    select: {
      userProfileId: true,
      isDefaultForNetworkId: true
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
        name: values.name
      }
    })
    for (const paybutton of paybuttonList) {
      if (paybutton.walletId !== null) {
        throw new Error(RESPONSE_MESSAGES.PAYBUTTON_ALREADY_BELONGS_TO_WALLET_400.message)
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
    if (addr.networkId === 1) {
      ret.XECBalance = ret.XECBalance.plus(addrBalance.balance)
    }
    if (addr.networkId === 2) {
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
