import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient
let backgroundPrisma: PrismaClient

interface CustomNodeJsGlobal extends NodeJS.Global {
  prisma: PrismaClient
  backgroundPrisma: PrismaClient
}
declare const global: CustomNodeJsGlobal

const backgroundDbUrl = (process.env.DATABASE_URL ?? '').replace(
  /connection_limit=\d+/,
  'connection_limit=3'
)

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
  backgroundPrisma = new PrismaClient({
    datasources: { db: { url: backgroundDbUrl } }
  })
} else {
  if (global.prisma === undefined) {
    global.prisma = new PrismaClient()
  }
  if (global.backgroundPrisma === undefined) {
    global.backgroundPrisma = new PrismaClient({
      datasources: { db: { url: backgroundDbUrl } }
    })
  }

  prisma = global.prisma
  backgroundPrisma = global.backgroundPrisma
}

export default prisma
export { backgroundPrisma }

// https://github.com/prisma/prisma/issues/1983#issuecomment-620621213
