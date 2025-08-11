import prisma from 'prisma-local/clientInstance'
import { type Wallet } from '@prisma/client'
import { RESPONSE_MESSAGES } from 'constants/index'

export const connectAddressToUser = async (addressId: string, userId: string, walletId: string | undefined): Promise<void> => {
  void await prisma.addressesOnUserProfiles.upsert({
    create: {
      walletId,
      userId,
      addressId
    },
    update: walletId == null ? {} : { walletId },
    where: {
      userId_addressId: {
        userId,
        addressId
      }
    }
  })
}

export const disconnectAddressFromUser = async (addressId: string, userId: string): Promise<void> => {
  await prisma.addressesOnUserProfiles.delete({
    where: {
      userId_addressId: {
        userId,
        addressId
      }
    }
  })
}

export const fetchAddressWallet = async (userId: string, addressId: string): Promise<Wallet | null> => {
  const conn = (await prisma.addressesOnUserProfiles.findUnique({
    where: {
      userId_addressId: {
        userId,
        addressId
      }
    },
    select: {
      wallet: true
    }
  }))
  if (conn === null) {
    throw new Error(RESPONSE_MESSAGES.NO_WALLET_FOUND_FOR_USER_ADDRESS_404.message)
  }
  return conn.wallet
}
