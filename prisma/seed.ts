import { PrismaClient } from '@prisma/client'
import { chains } from './seeds/chains'
import { paybuttons, addresses, connectors } from './seeds/paybuttons'
import { createDevUserRawQueryList } from './seeds/devUser'
const prisma = new PrismaClient()

async function main (): Promise<void> {
  // create chains
  if (await prisma.chain.count() === 0) {
    await prisma.chain.createMany({ data: chains })
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
