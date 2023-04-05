import { appInfo } from 'config/appInfo'
import IORedis from 'ioredis'

export const redis = new IORedis(appInfo.redisURL, {
  maxRetriesPerRequest: null
})

export const redisBullMQ = new IORedis(appInfo.redisURL, {
  maxRetriesPerRequest: null,
  db: 1
})

redis.on('error', (err) => console.log('Redis Client Error', err))
redisBullMQ.on('error', (err) => console.log('Redis BullMQ Client Error', err))
