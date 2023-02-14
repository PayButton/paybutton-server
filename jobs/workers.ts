import { Worker, Job, Queue } from 'bullmq'
import { Address } from '@prisma/client'
import { redis } from 'redis/clientInstance'
import { SYNC_NEW_ADDRESSES_DELAY, DEFAULT_WORKER_LOCK_DURATION } from 'constants/index'
import { getAddressPrefix } from 'utils/index'
import { Transaction } from 'grpc-bchrpc-node'

import * as transactionService from 'services/transactionService'
import * as priceService from 'services/priceService'
import * as addressService from 'services/addressService'
import * as grpcService from 'services/grpcService'

const syncAndSubscribeAddressList = async (addressList: Address[]): Promise<void> => {
  // sync addresses
  await Promise.all(
    addressList.map(async (addr) => {
      await transactionService.syncTransactionsAndPricesForAddress(addr.address)
    })
  )
  // subscribe addresses
  addressList.map(async (addr) => {
    await grpcService.subscribeTransactions(
      [addr.address],
      async (txn: Transaction.AsObject) => { await transactionService.upsertTransaction(txn, addr, true) },
      async (txn: Transaction.AsObject) => { await transactionService.upsertTransaction(txn, addr, false) },
      getAddressPrefix(addr.address)
    )
  })
}

const syncAllAddressTransactionsForNetworkJob = async (job: Job): Promise<void> => {
  console.log(`job ${job.id as string}: syncing all addresses for network ${job.data.networkId as string}...`)
  try {
    const addresses = await addressService.fetchAllAddressesForNetworkId(job.data.networkId)
    await syncAndSubscribeAddressList(addresses)
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

export const syncCurrentPricesWorker = async (queueName: string): Promise<void> => {
  const worker = new Worker(
    queueName,
    async (job) => {
      console.log(`job ${job.id as string}: syncing current prices...`)
      await priceService.syncCurrentPrices()
      await priceService.syncPastPrices()
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
        await syncAndSubscribeAddressList(newAddresses)
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
