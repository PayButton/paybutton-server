import config from 'config'
import IORedis, { ScanStream } from 'ioredis'
import { ScanStreamOptions } from 'ioredis/built/types'

class RedisMocked {
  async get (_: string): Promise<null> {
    return null
  }

  async del (key: string, data: any): Promise<void> {
  }

  async set (key: string, data: any): Promise<void> {
  }

  async keys (key: string): Promise<string[]> {
    return []
  }

  scanStream (opt: ScanStreamOptions): ScanStream {
    return new ScanStream({
      ...opt,
      command: '',
      redis: {}
    })
  }

  pipeline (commands?: unknown[][]): any {
    return {
    }
  }

  async on (key: string, fn: Function): Promise<void> {
  }
}

const getRedisClient = (isBullMQ = false): IORedis | RedisMocked => {
  if (process.env.NODE_ENV === 'test') {
    return new RedisMocked()
  }
  if (isBullMQ) {
    return new IORedis(config.redisURL, {
      maxRetriesPerRequest: null,
      db: 1
    })
  }

  return new IORedis(config.redisURL, {
    maxRetriesPerRequest: null
  })
}

export const redis = getRedisClient()
export const redisBullMQ = getRedisClient(true)

void redis.on('error', (err) => console.log('Redis Client Error', err))
void redisBullMQ.on('error', (err) => console.log('Redis BullMQ Client Error', err))
