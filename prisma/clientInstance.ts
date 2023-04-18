import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

interface CustomNodeJsGlobal extends NodeJS.Global {
  prisma: PrismaClient
}
declare const global: CustomNodeJsGlobal

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] })
} else {
  if (global.prisma === undefined) {
    global.prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] })
  }

  prisma = global.prisma
}

export default prisma

// https://github.com/prisma/prisma/issues/1983#issuecomment-620621213
