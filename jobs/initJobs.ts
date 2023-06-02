import { XEC_NETWORK_ID, BCH_NETWORK_ID, CURRENT_PRICE_REPEAT_DELAY, SYNC_TXS_JOBS_RETRY_DELAY, SYNC_TXS_JOBS_MAX_RETRIES } from 'constants/index'
import { Queue, FlowProducer, FlowJob } from 'bullmq'
import { redisBullMQ } from 'redis/clientInstance'
import {
  syncAndSubscribeAllAddressTransactionsForNetworkWorker,
  syncPricesWorker,
  syncAndSubscribeUnsyncedAddressesWorker,
  connectAllTransactionsToPricesWorker
} from './workers'
import EventEmitter from 'events'

EventEmitter.defaultMaxListeners = 20

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
  const connectPricesQueue = new Queue('connectPrices', { connection: redisBullMQ })

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
  const flowJobSyncAndSubscribeXECAddresses: FlowJob = {
    queueName: initTransactionsQueue.name,
    data: { networkId: XEC_NETWORK_ID },
    name: 'syncAndSubscribeXECAddressesFlow',
    opts: {
      removeOnFail: false,
      jobId: 'syncAndSubscribeXECAddresses',
      ...RETRY_OPTS
    }
  }
  const flowJobSyncAndSubscribeBCHAddresses: FlowJob = {
    queueName: initTransactionsQueue.name,
    data: { networkId: BCH_NETWORK_ID },
    name: 'syncAndSubscribeBCHAddressesFlow',
    opts: {
      removeOnFail: false,
      jobId: 'syncAndSubscribeBCHAddresses',
      ...RETRY_OPTS
    }
  }

  const flowJobConnectAllTransactions: FlowJob = {
    queueName: connectPricesQueue.name,
    data: {},
    name: 'connectAllTransactionsToPricesFlow',
    opts: {
      removeOnComplete: false,
      removeOnFail: { count: 3 },
      jobId: 'connectAllTransactionsToPrices',
      ...RETRY_OPTS
    }
  }

  const flowJobSyncAndSubscribeUnsyncedAddresses: FlowJob = {
    queueName: newAddressesQueue.name,
    data: {},
    name: 'syncAndSubscribeUnsyncedAddressesFlow',
    opts: {
      removeOnComplete: false,
      removeOnFail: { count: 3 },
      jobId: 'syncAndSubscribeUnsyncedAddresses',
      ...RETRY_OPTS
    }
  }

  const flowProducer = new FlowProducer({ connection: redisBullMQ })
  await flowProducer.add({
    ...flowJobSyncAndSubscribeUnsyncedAddresses,
    children: [
      {
        ...flowJobConnectAllTransactions,
        children: [
          {
            ...flowJobSyncAndSubscribeBCHAddresses,
            children: [
              {
                ...flowJobSyncAndSubscribeXECAddresses,
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
        every: CURRENT_PRICE_REPEAT_DELAY
      }
    }
  )

  await syncPricesWorker(pricesQueue.name)
  await syncAndSubscribeAllAddressTransactionsForNetworkWorker(initTransactionsQueue.name)
  await syncAndSubscribeUnsyncedAddressesWorker(newAddressesQueue)
  await connectAllTransactionsToPricesWorker(connectPricesQueue.name)
}

void main()
