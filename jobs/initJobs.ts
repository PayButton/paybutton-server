import { XEC_NETWORK_ID, BCH_NETWORK_ID, CURRENT_PRICE_SYNC_DELAY } from 'constants/index'
import { Queue, FlowProducer } from 'bullmq'
import { redisBullMQ } from 'redis/clientInstance'
import {
  syncAllAddressTransactionsForNetworkWorker,
  syncPricesWorker,
  syncUnsyncedAddressesWorker
} from './workers'

const RETRY_OPTS = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000
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
        name: 'syncXECAddresses',
        data: { networkId: XEC_NETWORK_ID },
        opts: {
          removeOnFail: false,
          jobId: 'syncXECAddresses',
          ...RETRY_OPTS
        },
        queueName: initTransactionsSync.name
      },
      {
        name: 'syncBCHAddresses',
        data: { networkId: BCH_NETWORK_ID },
        opts: {
          removeOnFail: false,
          jobId: 'syncBCHAddresses',
          ...RETRY_OPTS
        },
        queueName: initTransactionsSync.name
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
  await pricesSync.add('syncPastPrices',
    { syncType: 'past' },
    {
      removeOnFail: false,
      jobId: 'syncPastPrices',
      ...RETRY_OPTS
    }
  )

  await syncPricesWorker(pricesSync.name)
  await syncAllAddressTransactionsForNetworkWorker(initTransactionsSync.name)
  await syncUnsyncedAddressesWorker(newAddressesSync)
}

void main()
