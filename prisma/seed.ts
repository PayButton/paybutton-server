import { PrismaClient } from '@prisma/client'
import { chains } from './seeds/chains'
const prisma = new PrismaClient()

async function main (): Promise<void> {
  await prisma.chain.createMany({ data: chains })
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
