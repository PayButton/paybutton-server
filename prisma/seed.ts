import { PrismaClient } from '@prisma/client'
import { networks } from './seeds/networks'
import { paybuttons } from './seeds/paybuttons'
import { addresses } from './seeds/addresses'
import { connectors } from './seeds/connectors'
import { wallets } from './seeds/wallets'
import { createDevUserRawQueryList } from './seeds/devUser'
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
    await prisma.addressesOnButtons.createMany({ data: connectors })
  }
  // create default dev user
  for (const q of createDevUserRawQueryList) {
    await prisma.$executeRawUnsafe(q)
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
