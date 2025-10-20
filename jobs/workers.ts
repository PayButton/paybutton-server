import { Worker } from 'bullmq'
import { redisBullMQ } from 'redis/clientInstance'
import { DEFAULT_WORKER_LOCK_DURATION } from 'constants/index'
import { multiBlockchainClient } from 'services/chronikService'
import { connectAllTransactionsToPrices } from 'services/transactionService'

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
    console.log('syncing of current prices finished')
  })

  worker.on('failed', (job, err) => {
    if (job !== undefined) {
      console.log('syncing of current prices FAILED')
      console.log(`error for initial syncing of current prices: ${err.message}`)
    }
  })
}

export const syncBlockchainAndPricesWorker = async (queueName: string): Promise<void> => {
  const worker = new Worker(
    queueName,
    async (job) => {
      console.log(`job ${job.id as string}: syncing missed transactions and connecting prices...`)
      await multiBlockchainClient.syncMissedTransactions()
      await connectAllTransactionsToPrices()
    },
    {
      connection: redisBullMQ,
      lockDuration: DEFAULT_WORKER_LOCK_DURATION
    }
  )

  worker.on('completed', (job) => {
    // teardown
    void (async () => {
      console.log('Cleaning up MultiBlockchainClient global instance...')
      await multiBlockchainClient.destroy()
      console.log('Done.')
      console.log(`job ${job.id as string}: blockchain + prices sync finished`)
    })()
  })

  worker.on('failed', (job, err) => {
    if (job != null) {
      console.error(`job ${job.id as string}: FAILED — ${err.message}`)
    }
  })
}
