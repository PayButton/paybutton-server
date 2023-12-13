import { Worker, Job } from 'bullmq'
import { redisBullMQ } from 'redis/clientInstance'
import { DEFAULT_WORKER_LOCK_DURATION, RESPONSE_MESSAGES, KeyValueT } from 'constants/index'

import * as transactionService from 'services/transactionService'
import * as priceService from 'services/priceService'
import * as addressService from 'services/addressService'
import { parseError } from 'utils/validators'

const syncAllAddressTransactionsForNetworkJob = async (job: Job): Promise<void> => {
  console.log(`job ${job.id as string}: syncing all addresses for network ${job.data.networkId as string}...`)
  let failedAddressesWithErrors: KeyValueT<string> = {}
  try {
    let addresses = await addressService.fetchAllAddressesForNetworkId(job.data.networkId)
    console.log(`found ${addresses.length} addresses...`)
    addresses = addresses.filter(addr => addr.lastSynced == null)
    failedAddressesWithErrors = (await transactionService.syncAddresses(addresses)).failedAddressesWithErrors
  } catch (err: any) {
    const parsedError = parseError(err)
    if (parsedError.message === RESPONSE_MESSAGES.TRANSACTION_ALREADY_EXISTS_FOR_ADDRESS_400.message) {
      console.log(`initial syncing of network ${job.data.networkId as string} encountered known transaction, skipping...`)
    } else {
      if (Object.keys(failedAddressesWithErrors).length > 0) {
        console.error(`ERROR: (skipping anyway) initial syncing of network ${job.data.networkId as string} FAILED for addresses ${JSON.stringify(failedAddressesWithErrors)}: ${err.message as string}`)
      } else {
        console.error(`ERROR: (skipping anyway) initial syncing of network ${job.data.networkId as string} FAILED: ${err.message as string}`)
      }
    }
  }
}

export const syncAllAddressTransactionsForNetworkWorker = async (queueName: string): Promise<void> => {
  const worker = new Worker(
    queueName,
    syncAllAddressTransactionsForNetworkJob,
    {
      connection: redisBullMQ,
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

export const connectAllTransactionsToPricesWorker = async (queueName: string): Promise<void> => {
  const worker = new Worker(
    queueName,
    async (job) => {
      console.log(`job ${job.id as string}: connecting prices to transactions...`)
      const txs = [
        ...await transactionService.fetchAllTransactionsWithNoPrices(),
        ...await transactionService.fetchAllTransactionsWithIrregularPrices()
      ]
      void await transactionService.connectTransactionsListToPrices(txs)
    },
    {
      connection: redisBullMQ,
      lockDuration: DEFAULT_WORKER_LOCK_DURATION
    }
  )
  worker.on('completed', job => {
    console.log('connection of prices to txs finished')
  })

  worker.on('failed', (job, err) => {
    if (job !== undefined) {
      console.log('automatic connecting of txs to prices FAILED')
      console.log(`error for connecting txs to prices: ${err.message}: ${err.stack ?? 'no stack'}`)
    }
  })
}
