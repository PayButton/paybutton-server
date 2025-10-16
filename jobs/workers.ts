import { Worker } from 'bullmq'
import { redisBullMQ } from 'redis/clientInstance'
import { DEFAULT_WORKER_LOCK_DURATION } from 'constants/index'
import { multiBlockchainClient } from 'services/chronikService'
import { connectAllTransactionsToPrices } from 'services/transactionService'
import { cleanupExpiredClientPayments } from 'services/clientPaymentService'

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

export const cleanupClientPaymentsWorker = async (queueName: string): Promise<void> => {
  const worker = new Worker(
    queueName,
    async (job) => {
      console.log(`[CLIENT_PAYMENT CLEANUP] job ${job.id as string}: running expired payment cleanup...`)
      await cleanupExpiredClientPayments()
      console.log('[CLIENT_PAYMENT CLEANUP] cleanup finished.')
    },
    {
      connection: redisBullMQ,
      lockDuration: DEFAULT_WORKER_LOCK_DURATION
    }
  )

  worker.on('completed', job => {
    console.log(`[CLIENT_PAYMENT CLEANUP] job ${job.id as string}: completed successfully`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[CLIENT_PAYMENT CLEANUP] job ${job?.id as string}: FAILED — ${err.message}`)
  })
}
