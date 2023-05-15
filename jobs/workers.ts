import { Worker, Job, Queue } from 'bullmq'
import { Address } from '@prisma/client'
import { redisBullMQ } from 'redis/clientInstance'
import { SYNC_NEW_ADDRESSES_DELAY, DEFAULT_WORKER_LOCK_DURATION, RESPONSE_MESSAGES } from 'constants/index'

import * as transactionService from 'services/transactionService'
import * as priceService from 'services/priceService'
import * as addressService from 'services/addressService'
import { subscribeAddressesAddTransactions } from 'services/blockchainService'
import { parseError } from 'utils/validators'

const syncAndSubscribeAddresses = async (addresses: Address[]): Promise<string[]> => {
  const failedAddresses: string[] = []
  await Promise.all(
    addresses.map(async (addr) => {
      try {
        await subscribeAddressesAddTransactions([addr])
        await transactionService.syncAllTransactionsForAddress(addr.address, Infinity)
      } catch (err: any) {
        failedAddresses.push(addr.address)
      }
    })
  )
  return failedAddresses
}

const syncAndSubscribeAllAddressTransactionsForNetworkJob = async (job: Job): Promise<void> => {
  console.log(`job ${job.id as string}: syncing and subscribing all addresses for network ${job.data.networkId as string}...`)
  let failedAddresses: string [] = []
  try {
    const addresses = await addressService.fetchAllAddressesForNetworkId(job.data.networkId)
    failedAddresses = await syncAndSubscribeAddresses(addresses)
  } catch (err: any) {
    const parsedError = parseError(err)
    if (parsedError.message === RESPONSE_MESSAGES.TRANSACTION_ALREADY_EXISTS_FOR_ADDRESS_400.message) {
      console.log(`initial syncing of network ${job.data.networkId as string} encountered known transaction, skipping...`)
    } else {
      if (failedAddresses.length > 0) {
        console.error(`ERROR: (skipping anyway) initial syncing of network ${job.data.networkId as string} FAILED for addresses ${JSON.stringify(failedAddresses)}: ${err.message as string}`)
      } else {
        console.error(`ERROR: (skipping anyway) initial syncing of network ${job.data.networkId as string} FAILED: ${err.message as string}`)
      }
    }
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
        const failedAddresses = await syncAndSubscribeAddresses(newAddresses)
        if (failedAddresses.length > 0) {
          console.error(`automatic syncing of addresses failed for addresses: ${JSON.stringify(failedAddresses)}`)
        }
        job.data.syncedAddresses = newAddresses.filter(addr => !failedAddresses.includes(addr.address))
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
