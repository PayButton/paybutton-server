import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  if (global.prisma === undefined) {
    global.prisma = new PrismaClient()
  }

  prisma = global.prisma
}

export default prisma

// https://github.com/prisma/prisma/issues/1983#issuecomment-620621213
