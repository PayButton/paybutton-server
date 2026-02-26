import { CLIENT_PAYMENT_EXPIRATION_TIME, CURRENT_PRICE_REPEAT_DELAY } from 'constants/index'
import { Queue, QueueEvents } from 'bullmq'
import { redisBullMQ } from 'redis/clientInstance'
import EventEmitter from 'events'
import { syncCurrentPricesWorker, syncBlockchainAndPricesWorker, cleanupClientPaymentsWorker } from './workers'

EventEmitter.defaultMaxListeners = 20

const main = async (): Promise<void> => {
  // --- force fresh start ---
  const pricesQueue = new Queue('pricesSync', { connection: redisBullMQ })
  const blockchainQueue = new Queue('blockchainSync', { connection: redisBullMQ })
  const cleanupQueue = new Queue('clientPaymentCleanup', { connection: redisBullMQ })

  await pricesQueue.obliterate({ force: true })
  await blockchainQueue.obliterate({ force: true })
  await cleanupQueue.obliterate({ force: true })

  await blockchainQueue.add('syncBlockchainAndPrices',
    {},
    {
      jobId: 'syncBlockchainAndPrices',
      removeOnComplete: true,
      removeOnFail: true
    }
  )
  await syncBlockchainAndPricesWorker(blockchainQueue.name)

  const blockchainEvents = new QueueEvents('blockchainSync', { connection: redisBullMQ })
  await new Promise<void>((resolve) => {
    blockchainEvents.on('completed', async ({ jobId }) => {
      if (jobId === 'syncBlockchainAndPrices') {
        await blockchainEvents.close()
        resolve()
      }
    })
    blockchainEvents.on('failed', async ({ jobId }) => {
      if (jobId === 'syncBlockchainAndPrices') {
        await blockchainEvents.close()
        resolve()
      }
    })
  })

  await pricesQueue.add('syncCurrentPrices',
    {},
    {
      jobId: 'syncCurrentPrices',
      removeOnFail: false,
      repeat: {
        every: CURRENT_PRICE_REPEAT_DELAY
      }
    }
  )

  await syncCurrentPricesWorker(pricesQueue.name)

  await cleanupQueue.add(
    'cleanupClientPayments',
    {},
    {
      jobId: 'cleanupClientPayments',
      removeOnComplete: true,
      removeOnFail: true,
      repeat: {
        every: CLIENT_PAYMENT_EXPIRATION_TIME
      }
    }
  )

  await cleanupClientPaymentsWorker(cleanupQueue.name)
}

void main()
