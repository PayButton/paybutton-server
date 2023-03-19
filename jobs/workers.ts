import { Worker, Job, Queue } from 'bullmq'
import { Address } from '@prisma/client'
import { redis } from 'redis/clientInstance'
import { SYNC_NEW_ADDRESSES_DELAY, DEFAULT_WORKER_LOCK_DURATION } from 'constants/index'
import * as transactionService from 'services/transactionService'
import * as priceService from 'services/priceService'
import * as addressService from 'services/addressService'
import * as blockchainService from 'services/blockchainService'

const syncAndSubscribeAddresses = async (addresses: Address[]): Promise<void> => {
  await Promise.all(
    addresses.map(async (addr) => {
      await transactionService.syncTransactionsAndPricesForAddress(addr.address)
    })
  )
  await blockchainService.subscribeAddressesAddTransactions(addresses)
}

const syncAllAddressTransactionsForNetworkJob = async (job: Job): Promise<void> => {
  console.log(`job ${job.id as string}: syncing all addresses for network ${job.data.networkId as string}...`)
  try {
    const addresses = await addressService.fetchAllAddressesForNetworkId(job.data.networkId)
    await syncAndSubscribeAddresses(addresses)
  } catch (err: any) {
    throw new Error(`job ${job.id as string} failed with error ${err.message as string}`)
  }
}

export const syncAllAddressTransactionsForNetworkWorker = async (queueName: string): Promise<void> => {
  const worker = new Worker(
    queueName,
    syncAllAddressTransactionsForNetworkJob,
    {
      connection: redis,
      lockDuration: DEFAULT_WORKER_LOCK_DURATION
    }
  )
  worker.on('completed', job => {
    console.log(`initial syncing finished for network ${job.data.networkId as string}`)
  })

  worker.on('failed', (job, err) => {
    if (job !== undefined) {
      console.log(`initial syncing FAILED for network ${job.data.networkId as string}`)
      console.log(`error for initial syncing of network ${job.data.networkId as string}: ${err.message}`)
    }
  })
}

export const syncCurrentAndPastPricesWorker = async (queueName: string): Promise<void> => {
  const worker = new Worker(
    queueName,
    async (job) => {
      console.log(`job ${job.id as string}: syncing current and past prices...`)
      await priceService.syncCurrentPrices()
      await priceService.syncPastDaysNewerPrices()
    },
    {
      connection: redis,
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

export const syncUnsyncedAddressesWorker = async (queue: Queue): Promise<void> => {
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
        'syncUnsyncedAddresses',
        {},
        { delay: SYNC_NEW_ADDRESSES_DELAY }
      )
    },
    {
      connection: redis,
      lockDuration: DEFAULT_WORKER_LOCK_DURATION
    }
  )
  worker.on('completed', job => {
    if (job.data.syncedAddresses === undefined) {
      console.log('no new addresses to sync')
    } else {
      console.log('synced', job.data.syncedAddresses)
      job.data.syncedAddresses = undefined
    }
  })

  worker.on('failed', (job, err) => {
    if (job !== undefined) {
      console.log('automatic syncing of address FAILED')
      console.log(`error for automatic syncing of addresses: ${err.message}`)
    }
  })
}
