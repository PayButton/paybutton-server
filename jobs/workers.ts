import { Worker, Job, Queue } from 'bullmq'
import { Address } from '@prisma/client'
import { redisBullMQ } from 'redis/clientInstance'
import { SYNC_NEW_ADDRESSES_DELAY, DEFAULT_WORKER_LOCK_DURATION } from 'constants/index'

import * as transactionService from 'services/transactionService'
import * as priceService from 'services/priceService'
import * as addressService from 'services/addressService'
import { subscribeAddressesAddTransactions } from 'services/blockchainService'

const syncAndSubscribeAddresses = async (addresses: Address[]): Promise<void> => {
  await Promise.all(
    addresses.map(async (addr) => {
      await subscribeAddressesAddTransactions([addr])
      await transactionService.syncAllTransactionsForAddress(addr.address, Infinity)
    })
  )
}

const syncAndSubscribeAllAddressTransactionsForNetworkJob = async (job: Job): Promise<void> => {
  console.log(`job ${job.id as string}: syncing and subscribing all addresses for network ${job.data.networkId as string}...`)
  try {
    const addresses = await addressService.fetchAllAddressesForNetworkId(job.data.networkId)
    await syncAndSubscribeAddresses(addresses)
  } catch (err: any) {
    throw new Error(`job ${job.id as string} failed with error ${err.message as string}`)
  }
}

export const syncAndSubscribeAllAddressTransactionsForNetworkWorker = async (queueName: string): Promise<void> => {
  const worker = new Worker(
    queueName,
    syncAndSubscribeAllAddressTransactionsForNetworkJob,
    {
      connection: redisBullMQ,
      lockDuration: DEFAULT_WORKER_LOCK_DURATION
    }
  )
  worker.on('completed', job => {
    console.log(`initial syncing and subscribing finished for network ${job.data.networkId as string}`)
  })

  worker.on('failed', (job, err) => {
    if (job !== undefined) {
      console.log(`initial syncing and subscribing FAILED for network ${job.data.networkId as string}`)
      console.log(`error for initial syncing and subscribing of network ${job.data.networkId as string}: ${err.message}`)
    }
  })
}

export const syncPricesWorker = async (queueName: string): Promise<void> => {
  const worker = new Worker(
    queueName,
    async (job) => {
      const syncType = job.data.syncType
      console.log(`job ${job.id as string}: syncing ${syncType as string} prices...`)

      if (syncType === 'past') {
        await priceService.syncPastDaysNewerPrices()
      } else if (syncType === 'current') {
        await priceService.syncCurrentPrices()
      } else {
        console.log(`Unknown type of price sync: ${job.data.syncType as string}`)
      }
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

export const syncAndSubscribeUnsyncedAddressesWorker = async (queue: Queue): Promise<void> => {
  const worker = new Worker(
    queue.name,
    async (job) => {
      const newAddresses = await addressService.fetchUnsyncedAddresses()
      if (newAddresses.length !== 0) {
        await syncAndSubscribeAddresses(newAddresses)
        job.data.syncedAddresses = newAddresses
      }

      // add same job to the queue again, so it runs repeating
      await queue.add(
        'syncAndSubscribeUnsyncedAddresses',
        {},
        { delay: SYNC_NEW_ADDRESSES_DELAY }
      )
    },
    {
      connection: redisBullMQ,
      lockDuration: DEFAULT_WORKER_LOCK_DURATION
    }
  )
  worker.on('completed', job => {
    if (job.data.syncedAddresses === undefined) {
      console.log('no new addresses to sync and subscribe')
    } else {
      console.log('synced', job.data.syncedAddresses)
      job.data.syncedAddresses = undefined
    }
  })

  worker.on('failed', (job, err) => {
    if (job !== undefined) {
      console.log('automatic syncing and subscribing of address FAILED')
      console.log(`error for automatic syncing and subscribing of addresses: ${err.message}`)
    }
  })
}
