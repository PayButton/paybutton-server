import { XEC_NETWORK_ID, BCH_NETWORK_ID, CURRENT_PRICE_SYNC_DELAY } from 'constants/index'
import { Queue, FlowProducer } from 'bullmq'
import { redis } from 'redis/clientInstance'
import {
  syncAllAddressTransactionsForNetworkWorker,
  syncPricesWorker,
  syncUnsyncedAddressesWorker
} from './workers'

const main = async (): Promise<void> => {
  // sync all db addresses transactions
  const initTransactionsSync = new Queue('initTransactionsSync', { connection: redis })

  // sync current prices
  const pricesSync = new Queue('pricesSync', { connection: redis })

  // try to sync new addresses periodically
  const newAddressesSync = new Queue('newAddressesSync', { connection: redis })

  // create flow
  const flowProducer = new FlowProducer({ connection: redis })

  await flowProducer.add({
    name: 'syncUnsyncedAddresses',
    queueName: newAddressesSync.name,
    data: {},
    opts: {
      removeOnComplete: false,
      removeOnFail: false,
      jobId: 'syncUnsyncedAddresses'
    },
    children: [
      {
        name: 'syncXECAddresses',
        data: { networkId: XEC_NETWORK_ID },
        opts: { removeOnFail: false, jobId: 'syncXECAddresses' },
        queueName: initTransactionsSync.name
      },
      {
        name: 'syncBCHAddresses',
        data: { networkId: BCH_NETWORK_ID },
        opts: { removeOnFail: false, jobId: 'syncBCHAddresses' },
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
      jobId: 'syncPastPrices'
    }
  )

  await syncPricesWorker(pricesSync.name)
  await syncAllAddressTransactionsForNetworkWorker(initTransactionsSync.name)
  await syncUnsyncedAddressesWorker(newAddressesSync)
}

void main()
