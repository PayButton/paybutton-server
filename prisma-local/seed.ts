import { PrismaClient } from '@prisma/client'
import { networks } from './seeds/networks'
import { paybuttons } from './seeds/paybuttons'
import { addresses } from './seeds/addresses'
import { paybuttonAddressConnectors } from './seeds/paybuttonAddressConnectors'
import { walletUserConnectors } from './seeds/walletUserConnectors'
import { addressUserConnectors } from './seeds/addressUserConnectors'
import { wallets } from './seeds/wallets'
import { paybuttonTriggers } from './seeds/triggers'
import { getPrices } from './seeds/prices'
import { quotes } from './seeds/quotes'
import { createDevUsersRawQueryList, createAdminUserRawQueryList, devUserProfiles, adminUserProfiles } from './seeds/users'
const prisma = new PrismaClient()

export async function ignoreConflicts (callback: Function): Promise<void> {
  try {
    await callback()
  } catch (err: any) {
    if (err.code !== 'P2002') {
      throw err
    } else {
      console.warn('Ignored seeding duplicates when running', callback.name)
    }
  }
}

async function main (): Promise<void> {
  // don't seed in prod
  if (process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production') return
  // don't seed if skipped on env var
  if (process.env.IGNORE_SEEDING === 'true') return

  // create networks
  if (await prisma.network.count() === 0) {
    await prisma.network.createMany({ data: networks })
  }
  // create user profiles
  if (await prisma.userProfile.count() === 0) {
    await prisma.userProfile.createMany({ data: devUserProfiles })
    await prisma.userProfile.createMany({ data: adminUserProfiles })
  }
  // create wallets
  if (await prisma.wallet.count() === 0) {
    await prisma.wallet.createMany({ data: wallets })
  }
  // create paybuttons
  if (await prisma.paybutton.count() === 0) {
    await prisma.paybutton.createMany({ data: paybuttons })
    await prisma.address.createMany({ data: addresses })
    await prisma.addressesOnButtons.createMany({ data: paybuttonAddressConnectors })
  }
  // create paybuttonTriggers
  if (await prisma.paybuttonTrigger.count() === 0) {
    await prisma.paybuttonTrigger.createMany({ data: paybuttonTriggers })
  }
  // create users
  for (const q of createDevUsersRawQueryList) {
    await prisma.$executeRawUnsafe(q)
  }
  for (const q of createAdminUserRawQueryList) {
    await prisma.$executeRawUnsafe(q)
  }
  // create wallet user profiles connectors
  if (await prisma.walletsOnUserProfile.count() === 0) {
    await prisma.walletsOnUserProfile.createMany({ data: walletUserConnectors })
  }
  // create address user profiles connectors with wallets
  if (await prisma.addressesOnUserProfiles.count() === 0) {
    await prisma.addressesOnUserProfiles.createMany({ data: addressUserConnectors })
  }
  // create quotes
  if (await prisma.quote.count() === 0) {
    await prisma.quote.createMany({ data: quotes })
  }
  // create prices
  if (await prisma.price.count() === 0) {
    await prisma.price.createMany({ data: await getPrices() })
  }
}

main()
  .catch((e): any => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    void (async (): Promise<void> => {
      await prisma.$disconnect()
    })()
  })
