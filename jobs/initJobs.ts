import { CLIENT_PAYMENT_EXPIRATION_TIME, CURRENT_PRICE_REPEAT_DELAY, UNCONFIRMED_TX_CHECK_INTERVAL } from 'constants/index'
import { Queue } from 'bullmq'
import { redisBullMQ } from 'redis/clientInstance'
import EventEmitter from 'events'
import { syncCurrentPricesWorker, syncBlockchainAndPricesWorker, cleanupClientPaymentsWorker, verifyUnconfirmedTransactionsWorker } from './workers'

EventEmitter.defaultMaxListeners = 20

const main = async (): Promise<void> => {
  // --- force fresh start ---
  const pricesQueue = new Queue('pricesSync', { connection: redisBullMQ })
  const blockchainQueue = new Queue('blockchainSync', { connection: redisBullMQ })
  const cleanupQueue = new Queue('clientPaymentCleanup', { connection: redisBullMQ })
  const unconfirmedTxQueue = new Queue('unconfirmedTxVerification', { connection: redisBullMQ })

  await pricesQueue.obliterate({ force: true })
  await blockchainQueue.obliterate({ force: true })
  await cleanupQueue.obliterate({ force: true })
  await unconfirmedTxQueue.obliterate({ force: true })

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

  await blockchainQueue.add('syncBlockchainAndPrices',
    {},
    {
      jobId: 'syncBlockchainAndPrices',
      removeOnComplete: true,
      removeOnFail: true
    }
  )
  await syncBlockchainAndPricesWorker(blockchainQueue.name)

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

  await unconfirmedTxQueue.add(
    'verifyUnconfirmedTransactions',
    {},
    {
      jobId: 'verifyUnconfirmedTransactions',
      removeOnComplete: true,
      removeOnFail: true,
      repeat: {
        every: UNCONFIRMED_TX_CHECK_INTERVAL
      }
    }
  )

  await verifyUnconfirmedTransactionsWorker(unconfirmedTxQueue.name)
}

void main()
