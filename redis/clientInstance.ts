import { appInfo } from 'config/appInfo'
import IORedis from 'ioredis'

export const redis = new IORedis(appInfo.redisURL, {
  maxRetriesPerRequest: null
})

redis.on('error', (err) => console.log('Redis Client Error', err))
