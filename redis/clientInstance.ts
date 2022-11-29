import { createClient } from 'redis'

export const client = createClient({ url: 'redis://paybutton-cache:6379' })
client.on('error', (err) => console.log('Redis Client Error', err))

void client.connect()

export default client
