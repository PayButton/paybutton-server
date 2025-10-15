import { CURRENT_PRICE_REPEAT_DELAY } from 'constants/index'
import { Queue } from 'bullmq'
import { redisBullMQ } from 'redis/clientInstance'
import EventEmitter from 'events'
import { syncCurrentPricesWorker, syncBlockchainAndPricesWorker } from './workers'

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
}

void main()
