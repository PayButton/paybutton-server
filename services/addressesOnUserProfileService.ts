import prisma from 'prisma/clientInstance'

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
