import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient

const CONNECTION_LIMIT = 5
const POOL_TIMEOUT = 30

function buildDatasourceUrl (): string {
  const baseUrl = process.env.DATABASE_URL ?? ''
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}connection_limit=${CONNECTION_LIMIT}&pool_timeout=${POOL_TIMEOUT}`
}

interface CustomNodeJsGlobal extends NodeJS.Global {
  prisma: PrismaClient
}
declare const global: CustomNodeJsGlobal

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({ datasources: { db: { url: buildDatasourceUrl() } } })
} else {
  if (global.prisma === undefined) {
    global.prisma = new PrismaClient({ datasources: { db: { url: buildDatasourceUrl() } } })
  }

  prisma = global.prisma
}

export default prisma

// https://github.com/prisma/prisma/issues/1983#issuecomment-620621213
