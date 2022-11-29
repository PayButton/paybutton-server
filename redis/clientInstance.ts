import { createClient } from 'redis'
import { appInfo } from 'config/appInfo'

export const redis = createClient({ url: appInfo.redisURL })
redis.on('error', (err) => console.log('Redis Client Error', err))

void redis.connect()

export default redis
