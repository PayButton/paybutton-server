import config from 'config'
import IORedis, { ScanStream } from 'ioredis'
import { ScanStreamOptions } from 'ioredis/built/types'

class RedisMocked {
  private readonly sets = new Map<string, Set<string>>()

  async get (_: string): Promise<null> {
    return null
  }

  async sadd (key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key) ?? new Set<string>()
    const before = set.size
    members.forEach(m => set.add(m))
    this.sets.set(key, set)
    return set.size - before
  }

  async smembers (key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? [])]
  }

  async srem (key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key)
    if (set === undefined) return 0
    return members.filter(m => set.delete(m)).length
  }

  async del (key: string, data: any): Promise<void> {
  }

  async set (key: string, data: any): Promise<void> {
  }

  async keys (key: string): Promise<string[]> {
    return []
  }

  scanStream (opt: ScanStreamOptions): ScanStream {
    const stream = new ScanStream({
      ...opt,
      command: 'scan',
      redis: this as unknown as IORedis
    })
    process.nextTick(() => {
      stream.emit('end')
    })
    return stream
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
