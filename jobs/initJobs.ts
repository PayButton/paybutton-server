import { CLIENT_PAYMENT_EXPIRATION_TIME, CURRENT_PRICE_REPEAT_DELAY } from 'constants/index'
import { Queue } from 'bullmq'
import { redisBullMQ } from 'redis/clientInstance'
import EventEmitter from 'events'
import { syncCurrentPricesWorker, syncBlockchainAndPricesWorker, cleanupClientPaymentsWorker } from './workers'

EventEmitter.defaultMaxListeners = 20

const main = async (): Promise<void> => {
  const pricesQueue = new Queue('pricesSync', { connection: redisBullMQ })
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

  const blockchainQueue = new Queue('blockchainSync', { connection: redisBullMQ })
  await blockchainQueue.add('syncBlockchainAndPrices', {}, { jobId: 'syncBlockchainAndPrices' })
  await syncBlockchainAndPricesWorker(blockchainQueue.name)

  const cleanupQueue = new Queue('clientPaymentCleanup', { connection: redisBullMQ })

  await cleanupQueue.add(
    'cleanupClientPayments',
    {},
    {
      jobId: 'cleanupClientPayments',
      removeOnFail: false,
      repeat: {
        every: CLIENT_PAYMENT_EXPIRATION_TIME
      }
    }
  )

  await cleanupClientPaymentsWorker(cleanupQueue.name)
}

void main()
