import { Worker, Job, Queue } from 'bullmq'
import { redis } from 'redis/clientInstance'
import { SYNC_NEW_ADDRESSES_DELAY } from 'constants/index'

import * as transactionService from 'services/transactionService'
import * as priceService from 'services/priceService'
import * as addressService from 'services/addressService'

const syncAllAddressTransactionsForNetworkJob = async (job: Job): Promise<void> => {
  console.log(`job ${job.id as string}: syncing all addresses for network ${job.data.networkId as string}...`)
  try {
    const addresses = await addressService.fetchAllAddressesForNetworkId(job.data.networkId)
    await Promise.all(
      addresses.map(async (addr) => {
        await transactionService.syncTransactionsAndPricesForAddress(addr.address)
      })
    )
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
      lockDuration: 120000
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

export const syncCurrentPricesWorker = async (queueName: string): Promise<void> => {
  const worker = new Worker(
    queueName,
    async (job) => {
      console.log(`job ${job.id as string}: syncing current prices...`)
      void priceService.syncCurrentPrices()
    },
    {
      connection: redis,
      lockDuration: 120000
    }
  )
  worker.on('completed', job => {
    console.log('initial syncing of current prices finished')
  })

  worker.on('failed', (job, err) => {
    if (job !== undefined) {
      console.log('initial syncing of current prices FAILED')
      console.log(`error for initial syncing of current prices: ${err.message}`)
    }
  })
}

export const syncUnsyncedAddressesWorker = async (queue: Queue): Promise<void> => {
  const worker = new Worker(
    queue.name,
    async (job) => {
      const newAddresses = (await addressService.fetchUnsyncedAddresses()).map((addr) => addr.address)
      if (newAddresses.length !== 0) {
        job.data.syncedAddresses = newAddresses
        await Promise.all(
          newAddresses.map(async (addr) => {
            await transactionService.syncTransactionsAndPricesForAddress(addr)
          })
        )
      }
      await queue.add(
        'syncUnsyncedAddresses',
        {},
        { delay: SYNC_NEW_ADDRESSES_DELAY }
      )
    },
    {
      connection: redis,
      lockDuration: 120000
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
