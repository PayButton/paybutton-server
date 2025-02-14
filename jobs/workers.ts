import { Worker } from 'bullmq'
import { redisBullMQ } from 'redis/clientInstance'
import { DEFAULT_WORKER_LOCK_DURATION } from 'constants/index'

import * as priceService from 'services/priceService'

export const syncCurrentPricesWorker = async (queueName: string): Promise<void> => {
  const worker = new Worker(
    queueName,
    async (job) => {
      console.log(`job ${job.id as string}: syncing current prices...`)
      await priceService.syncCurrentPrices()
    },
    {
      connection: redisBullMQ,
      lockDuration: DEFAULT_WORKER_LOCK_DURATION
    }
  )
  worker.on('completed', job => {
    console.log(`syncing of ${job.data.syncType as string} prices finished`)
  })

  worker.on('failed', (job, err) => {
    if (job !== undefined) {
      console.log(`syncing of ${job.data.syncType as string} prices FAILED`)
      console.log(`error for initial syncing of ${job.data.syncType as string} prices: ${err.message}`)
    }
  })
}
