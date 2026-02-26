import { PrismaClient, Prisma } from '@prisma/client'

let prisma: PrismaClient

const CONNECTION_LIMIT = 10
const POOL_TIMEOUT = 60
const SLOW_QUERY_THRESHOLD_MS = 10000

function buildDatasourceUrl (): string {
  const baseUrl = process.env.DATABASE_URL ?? ''
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${separator}connection_limit=${CONNECTION_LIMIT}&pool_timeout=${POOL_TIMEOUT}`
}

function createPrismaClient (): PrismaClient {
  const logLevels: Prisma.LogLevel[] = process.env.PRISMA_LOG === 'true'
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error']

  const client = new PrismaClient({
    datasources: { db: { url: buildDatasourceUrl() } },
    log: [
      ...logLevels.map(level => ({ level, emit: 'event' as const })),
      { level: 'query' as const, emit: 'event' as const }
    ]
  })

  // Log slow queries even when PRISMA_LOG is off
  client.$on('query', (e: Prisma.QueryEvent) => {
    if (e.duration >= SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[Prisma SLOW QUERY] ${e.duration}ms: ${e.query.slice(0, 200)}...`)
    }
  })

  return client
}

interface CustomNodeJsGlobal extends NodeJS.Global {
  prisma: PrismaClient
}
declare const global: CustomNodeJsGlobal

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient()
} else {
  if (global.prisma === undefined) {
    global.prisma = createPrismaClient()
  }

  prisma = global.prisma
}

export default prisma
