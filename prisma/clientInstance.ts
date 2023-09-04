import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

interface CustomNodeJsGlobal extends NodeJS.Global {
  prisma: PrismaClient
}
declare const global: CustomNodeJsGlobal

if (global.prisma === undefined) {
  global.prisma = new PrismaClient()
}

prisma = global.prisma

export default prisma

// https://github.com/prisma/prisma/issues/1983#issuecomment-620621213
