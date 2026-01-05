import { Worker } from 'bullmq'
import { redisBullMQ } from 'redis/clientInstance'
import { DEFAULT_WORKER_LOCK_DURATION, NETWORK_SLUGS_FROM_IDS } from 'constants/index'
import { multiBlockchainClient } from 'services/chronikService'
import { connectAllTransactionsToPrices, fetchUnconfirmedNonOrphanedTransactions, markTransactionConfirmed, markTransactionsOrphaned } from 'services/transactionService'
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
      console.log(`job ${job.id as string}: syncing missed prices, transactions and connecting them...`)
      await priceService.syncPastDaysNewerPrices()
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

export const verifyUnconfirmedTransactionsWorker = async (queueName: string): Promise<void> => {
  const worker = new Worker(
    queueName,
    async (job) => {
      console.log(`[UNCONFIRMED TX VERIFICATION] job ${job.id as string}: checking unconfirmed transactions...`)

      const unconfirmedTxs = await fetchUnconfirmedNonOrphanedTransactions()
      console.log(`[UNCONFIRMED TX VERIFICATION] Found ${unconfirmedTxs.length} unconfirmed transactions to verify`)

      let confirmedCount = 0
      let orphanedCount = 0
      const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60)

      // Group transactions by hash to avoid duplicate chronik calls
      const txsByHash = new Map<string, typeof unconfirmedTxs>()
      for (const tx of unconfirmedTxs) {
        const existing = txsByHash.get(tx.hash) ?? []
        existing.push(tx)
        txsByHash.set(tx.hash, existing)
      }

      for (const [hash, txs] of txsByHash.entries()) {
        const networkId = txs[0].address.networkId
        const networkSlug = NETWORK_SLUGS_FROM_IDS[networkId]

        try {
          const txDetails = await multiBlockchainClient.getTransactionDetails(hash, networkSlug)

          // If tx has a block, it's confirmed
          if (txDetails.block?.height !== undefined && txDetails.block.height !== null) {
            const blockTimestamp = Number(txDetails.block.timestamp)
            await markTransactionConfirmed(hash, blockTimestamp)
            confirmedCount += txs.length
            console.log(`[UNCONFIRMED TX VERIFICATION] Marked tx ${hash} as confirmed`)
          } else {
            // Still unconfirmed - txs over a day old should always be either confirmed or orphaned
            const oldestTx = txs.reduce((oldest, tx) => tx.timestamp < oldest.timestamp ? tx : oldest, txs[0])
            if (oldestTx.timestamp < oneDayAgo) {
              console.warn(`[UNCONFIRMED TX VERIFICATION] WARNING: tx ${hash} is over 1 day old and still unconfirmed (address: ${oldestTx.address.address})`)
            }
          }
        } catch (err: any) {
          const errMsg = String(err?.message ?? err)
          const is404 = /not found in the index|404/.test(errMsg)

          if (is404) {
            // Transaction no longer exists on the network
            await markTransactionsOrphaned(hash)
            orphanedCount += txs.length
            console.log(`[UNCONFIRMED TX VERIFICATION] Marked tx ${hash} as orphaned (not found)`)
          } else {
            console.error(`[UNCONFIRMED TX VERIFICATION] Error checking tx ${hash}: ${errMsg}`)
          }
        }
      }

      console.log(`[UNCONFIRMED TX VERIFICATION] Finished: ${confirmedCount} confirmed, ${orphanedCount} orphaned`)
    },
    {
      connection: redisBullMQ,
      lockDuration: DEFAULT_WORKER_LOCK_DURATION
    }
  )

  worker.on('completed', job => {
    console.log(`[UNCONFIRMED TX VERIFICATION] job ${job.id as string}: completed successfully`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[UNCONFIRMED TX VERIFICATION] job ${job?.id as string}: FAILED — ${err.message}`)
  })
}
