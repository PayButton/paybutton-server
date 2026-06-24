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

interface AddressCacheInvalidationResult {
  paymentFailures: number
  balanceFailures: number
}

const invalidateAddressCaches = async (
  address: string
): Promise<AddressCacheInvalidationResult> => {
  let paymentFailures = 0
  let balanceFailures = 0
  try {
    await clearPaymentCacheForAddress(address)
  } catch {
    paymentFailures = 1
  }
  try {
    await clearBalanceCache(address)
  } catch {
    balanceFailures = 1
  }
  return { paymentFailures, balanceFailures }
}

/**
 * Drop Redis payment-week, balance, and dashboard caches after bulk blockchain sync.
 * Rebuild is lazy on the next API request.
 */
async function invalidateCachesAfterBlockchainSync (): Promise<void> {
  console.log('[CACHE]: Invalidating caches after blockchain sync...')
  const addresses = await fetchAllAddresses()
  let paymentCacheFailures = 0
  let balanceCacheFailures = 0
  for (let i = 0; i < addresses.length; i += ADDRESS_INVALIDATION_BATCH_SIZE) {
    const batch = addresses.slice(i, i + ADDRESS_INVALIDATION_BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (a) => await invalidateAddressCaches(a.address))
    )
    for (const r of results) {
      paymentCacheFailures += r.paymentFailures
      balanceCacheFailures += r.balanceFailures
    }
  }
  const users = await fetchAllUsers()
  let dashboardCacheFailures = 0
  await Promise.all(
    users.map(async (u) => {
      try {
        await clearDashboardCache(u.id)
      } catch {
        dashboardCacheFailures += 1
      }
    })
  )
  const totalFailures =
    paymentCacheFailures + balanceCacheFailures + dashboardCacheFailures
  if (totalFailures > 0) {
    console.warn(
      `[CACHE]: Cache invalidation completed with ${totalFailures} failure(s) ` +
      `(payment: ${paymentCacheFailures}, balance: ${balanceCacheFailures}, ` +
      `dashboard: ${dashboardCacheFailures}). DB sync already succeeded.`
    )
  }
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
