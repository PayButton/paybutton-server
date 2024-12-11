import { PrismaClient } from '@prisma/client'

interface CustomNodeJsGlobal extends NodeJS.Global {
  prisma: PrismaClient
}
declare const global: CustomNodeJsGlobal

if (global.prisma === undefined) {
  global.prisma = new PrismaClient()
}

const prisma = global.prisma

export default prisma

// https://github.com/prisma/prisma/issues/1983#issuecomment-620621213
