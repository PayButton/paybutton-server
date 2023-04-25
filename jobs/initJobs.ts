import { XEC_NETWORK_ID, BCH_NETWORK_ID, CURRENT_PRICE_SYNC_DELAY, SYNC_TXS_JOBS_RETRY_DELAY, SYNC_TXS_JOBS_MAX_RETRIES, SUBSCRIBE_ADDRESSES_RETRY_DELAY } from 'constants/index'
import { Queue, FlowProducer, FlowJob } from 'bullmq'
import { redisBullMQ } from 'redis/clientInstance'
import {
  syncAllAddressTransactionsForNetworkWorker,
  subscribeAddressesWorker,
  syncPricesWorker,
  syncUnsyncedAddressesWorker
} from './workers'

const RETRY_OPTS = {
  attempts: SYNC_TXS_JOBS_MAX_RETRIES,
  backoff: {
    type: 'exponential',
    delay: SYNC_TXS_JOBS_RETRY_DELAY
  }
}

const main = async (): Promise<void> => {
  const pricesQueue = new Queue('pricesSync', { connection: redisBullMQ })
  const initTransactionsQueue = new Queue('initTransactionsSync', { connection: redisBullMQ })
  const newAddressesQueue = new Queue('newAddressesSync', { connection: redisBullMQ })
  const subscribeAddressesQueue = new Queue('subscribeAddressesSync', { connection: redisBullMQ })

  const flowJobPrices: FlowJob = {
    queueName: pricesQueue.name,
    data: { syncType: 'past' },
    name: 'syncPastPricesFlow',
    opts: {
      removeOnFail: false,
      jobId: 'syncPastPrices',
      ...RETRY_OPTS
    }
  }
  const flowJobSyncXECAddresses: FlowJob = {
    queueName: initTransactionsQueue.name,
    data: { networkId: XEC_NETWORK_ID },
    name: 'syncXECAddressesFlow',
    opts: {
      removeOnFail: false,
      jobId: 'syncXECAddresses',
      ...RETRY_OPTS
    }
  }
  const flowJobSyncBCHAddresses: FlowJob = {
    queueName: initTransactionsQueue.name,
    data: { networkId: BCH_NETWORK_ID },
    name: 'syncBCHAddressesFlow',
    opts: {
      removeOnFail: false,
      jobId: 'syncBCHAddresses',
      ...RETRY_OPTS
    }
  }
  const flowJobSyncUnsyncedAddresses: FlowJob = {
    queueName: newAddressesQueue.name,
    data: {},
    name: 'syncUnsyncedAddressesFlow',
    opts: {
      removeOnComplete: false,
      removeOnFail: { count: 3 },
      jobId: 'syncUnsyncedAddresses',
      ...RETRY_OPTS
    }
  }
  const flowJobSubscribeAddresses: FlowJob = {
    queueName: subscribeAddressesQueue.name,
    data: {},
    name: 'subscribeAddressesFlow',
    opts: {
      removeOnComplete: false,
      removeOnFail: { count: 3 },
      jobId: 'subscribeAddresses',
      ...RETRY_OPTS
    }
  }

  const flowProducer = new FlowProducer({ connection: redisBullMQ })
  await flowProducer.add({
    ...flowJobSubscribeAddresses,
    children: [
      {
        ...flowJobSyncUnsyncedAddresses,
        children: [
          {
            ...flowJobSyncBCHAddresses,
            children: [
              {
                ...flowJobSyncXECAddresses,
                children: [flowJobPrices]
              }
            ]
          }
        ]
      }
    ]
  })

  await pricesQueue.add('syncCurrentPrices',
    { syncType: 'current' },
    {
      jobId: 'syncCurrentPrices',
      removeOnFail: false,
      repeat: {
        every: CURRENT_PRICE_SYNC_DELAY
      }
    }
  )

  await subscribeAddressesQueue.add('subscribeAddresses',
    {},
    {
      jobId: 'subscribeAddresses',
      removeOnFail: false,
      repeat: {
        every: SUBSCRIBE_ADDRESSES_RETRY_DELAY
      }
    }
  )

  await syncPricesWorker(pricesQueue.name)
  await syncAllAddressTransactionsForNetworkWorker(initTransactionsQueue.name)
  await subscribeAddressesWorker(subscribeAddressesQueue.name)
  await syncUnsyncedAddressesWorker(newAddressesQueue)
}

void main()
