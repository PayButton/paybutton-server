import { XEC_NETWORK_ID, BCH_NETWORK_ID, CURRENT_PRICE_SYNC_DELAY, SYNC_TXS_JOBS_RETRY_DELAY, SYNC_TXS_JOBS_MAX_RETRIES } from 'constants/index'
import { Queue, FlowProducer } from 'bullmq'
import { redisBullMQ } from 'redis/clientInstance'
import {
  syncAllAddressTransactionsForNetworkWorker,
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
  // sync all db addresses transactions
  const initTransactionsSync = new Queue('initTransactionsSync', { connection: redisBullMQ })

  // sync current prices
  const pricesSync = new Queue('pricesSync', { connection: redisBullMQ })

  // try to sync new addresses periodically
  const newAddressesSync = new Queue('newAddressesSync', { connection: redisBullMQ })

  // create flow
  const flowProducer = new FlowProducer({ connection: redisBullMQ })

  await flowProducer.add({
    name: 'syncUnsyncedAddresses',
    queueName: newAddressesSync.name,
    data: {},
    opts: {
      removeOnComplete: false,
      removeOnFail: { count: 3 },
      jobId: 'syncUnsyncedAddresses',
      ...RETRY_OPTS
    },
    children: [
      {
        name: 'syncBCHAddresses',
        data: { networkId: BCH_NETWORK_ID },
        opts: {
          removeOnFail: false,
          jobId: 'syncBCHAddresses',
          ...RETRY_OPTS
        },
        queueName: initTransactionsSync.name,
        children: [
          {
            name: 'syncXECAddresses',
            data: { networkId: XEC_NETWORK_ID },
            opts: {
              removeOnFail: false,
              jobId: 'syncXECAddresses',
              ...RETRY_OPTS
            },
            queueName: initTransactionsSync.name,
            children: [
              {
                name: 'syncPastPrices',
                data: { syncType: 'past' },
                opts: {
                  removeOnFail: false,
                  jobId: 'syncPastPrices',
                  ...RETRY_OPTS
                },
                queueName: pricesSync.name
              }
            ]
          }
        ]
      }
    ]
  })

  await pricesSync.add('syncCurrentPrices',
    { syncType: 'current' },
    {
      removeOnFail: false,
      jobId: 'syncCurrentPrices',
      repeat: {
        every: CURRENT_PRICE_SYNC_DELAY
      }
    }
  )

  await syncPricesWorker(pricesSync.name)
  await syncAllAddressTransactionsForNetworkWorker(initTransactionsSync.name)
  await syncUnsyncedAddressesWorker(newAddressesSync)
}

void main()
