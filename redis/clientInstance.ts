import { createClient } from 'redis'
import { appInfo } from 'config/appInfo'

export const client = createClient({ url: appInfo.redisURL })
client.on('error', (err) => console.log('Redis Client Error', err))

void client.connect()

export default client
