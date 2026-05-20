import { Worker } from 'bullmq'
import { redisBullMQ } from 'redis/clientInstance'
import { DEFAULT_WORKER_LOCK_DURATION } from 'constants/index'
import { clearBalanceCache } from 'redis/balanceCache'
import { clearDashboardCache } from 'redis/dashboardCache'
import { clearPaymentCacheForAddress } from 'redis/paymentCache'
import { fetchAllAddresses } from 'services/addressService'
import { cleanupExpiredClientPayments } from 'services/clientPaymentService'
import { multiBlockchainClient } from 'services/chronikService'
import { connectAllTransactionsToPrices } from 'services/transactionService'
import { fetchAllUsers } from 'services/userService'

import * as priceService from 'services/priceService'

const ADDRESS_INVALIDATION_BATCH_SIZE = 100

/**
 * Drop Redis payment-week, balance, and dashboard caches after bulk blockchain sync.
 * Rebuild is lazy on the next API request.
 */
async function invalidateCachesAfterBlockchainSync (): Promise<void> {
  console.log('[CACHE]: Invalidating caches after blockchain sync...')
  const addresses = await fetchAllAddresses()
  for (let i = 0; i < addresses.length; i += ADDRESS_INVALIDATION_BATCH_SIZE) {
    const batch = addresses.slice(i, i + ADDRESS_INVALIDATION_BATCH_SIZE)
    await Promise.all(
      batch.map(async (a) => {
        await clearPaymentCacheForAddress(a.address)
        await clearBalanceCache(a.address)
      })
    )
  }
  const users = await fetchAllUsers()
  await Promise.all(users.map(async (u) => await clearDashboardCache(u.id)))
  console.log(
    `[CACHE]: Invalidated payment/balance caches for ${addresses.length} addresses ` +
    `and dashboard caches for ${users.length} users.`
  )
}

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

export const syncBlockchainAndPricesWorker = async (queueName: string, onComplete?: () => Promise<void> | void): Promise<void> => {
  const worker = new Worker(
    queueName,
    async (job) => {
      console.log(`job ${job.id as string}: syncing missed prices, transactions and connecting them...`)
      await priceService.syncPastDaysNewerPrices()
      await multiBlockchainClient.syncMissedTransactions()
      await connectAllTransactionsToPrices()
      await invalidateCachesAfterBlockchainSync()
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
      await onComplete?.()
    })()
  })

  worker.on('failed', (job, err) => {
    void (async () => {
      if (job != null) {
        console.error(`job ${job.id as string}: FAILED — ${err.message}`)
      }
      await multiBlockchainClient.destroy()
    })()
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
