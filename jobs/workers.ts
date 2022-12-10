import { Worker, Job } from 'bullmq'
import { redis } from 'redis/clientInstance'

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
      connection: redis
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
      connection: redis
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
