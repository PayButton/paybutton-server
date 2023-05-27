import { PrismaClient } from '@prisma/client'
import { networks } from './seeds/networks'
import { paybuttons } from './seeds/paybuttons'
import { addresses, productionAddresses } from './seeds/addresses'
import { paybuttonAddressConnectors } from './seeds/paybuttonAddressConnectors'
import { walletUserConnectors } from './seeds/walletUserConnectors'
import { addressUserConnectors } from './seeds/addressUserConnectors'
import { wallets } from './seeds/wallets'
import { getPrices } from './seeds/prices'
import { quotes } from './seeds/quotes'
import { createDevUserRawQueryList, userProfiles } from './seeds/devUser'
import { getTxs } from './seeds/transactions'
const prisma = new PrismaClient()

async function main (): Promise<void> {
  // create networks
  if (await prisma.network.count() === 0) {
    await prisma.network.createMany({ data: networks })
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
  // create default dev user
  for (const q of createDevUserRawQueryList) {
    await prisma.$executeRawUnsafe(q)
  }
  // create user profiles
  if (await prisma.userProfile.count() === 0) {
    await prisma.userProfile.createMany({ data: userProfiles })
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

  // PRODUCTION
  if (process.env.NODE_ENV === 'production') {
    await prisma.address.createMany({ data: productionAddresses })
    const productionTxs = await getTxs()
    if (productionTxs !== undefined) {
      await prisma.transaction.createMany({ data: productionTxs })
    } else {
      console.log('No production txs found to seed.')
    }
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
