import { appInfo } from 'config/appInfo'
import IORedis from 'ioredis'

class RedisMocked {
  async get (_: string): Promise<string> {
    return ''
  }

  async set (key: string, data: any): Promise<void> {
  }

  async keys (key: string): Promise<string[]> {
    return []
  }

  async on (key: string, fn: Function): Promise<void> {
  }
}

const getRedisClient = (isBullMQ = false): IORedis | RedisMocked => {
  if (process.env.NODE_ENV === 'test') {
    return new RedisMocked()
  }
  if (isBullMQ) {
    return new IORedis(appInfo.redisURL, {
      maxRetriesPerRequest: null,
      db: 1
    })
  }

  return new IORedis(appInfo.redisURL, {
    maxRetriesPerRequest: null
  })
}

export const redis = getRedisClient()
export const redisBullMQ = getRedisClient(true)

void redis.on('error', (err) => console.log('Redis Client Error', err))
void redisBullMQ.on('error', (err) => console.log('Redis BullMQ Client Error', err))
