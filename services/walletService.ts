// import * as networkService from 'services/networkService'
import * as paybuttonService from 'services/paybuttonService'
import { Wallet } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { RESPONSE_MESSAGES } from 'constants/index'

export interface CreateWalletInput {
  userId: string
  name: string
  paybuttonIdList: number[]
}

export async function createWallet (values: CreateWalletInput): Promise<Wallet> {
  const paybuttonList = await paybuttonService.fetchPaybuttonArrayByIds(values.paybuttonIdList)
  let wallet: Wallet
  return await prisma.$transaction(async (prisma) => {
    wallet = await prisma.wallet.create({
      data: {
        providerUserId: values.userId,
        name: values.name
      },
      include: {
        addresses: {
          select: {
            address: true
          }
        }
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

export async function fetchWalletById (walletId: number | string): Promise<Wallet | null> {
  return await prisma.wallet.findUnique({
    where: { id: Number(walletId) },
    include: {
      addresses: {
        select: {
          id: true,
          address: true
        }
      }
    }
  })
}

export async function fetchWalletArrayByUserId (userId: string): Promise<Wallet[]> {
  return await prisma.wallet.findMany({
    where: { providerUserId: userId },
    include: {
      paybuttons: true,
      addresses: {
        select: {
          id: true,
          address: true
        }
      }
    }
  })
}
