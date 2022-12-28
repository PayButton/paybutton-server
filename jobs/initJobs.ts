import { XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'
import { Queue, FlowProducer } from 'bullmq'
import { redis } from 'redis/clientInstance'
import {
  syncAllAddressTransactionsForNetworkWorker,
  syncCurrentPricesWorker,
  syncUnsyncedAddressesWorker
} from './workers'

const main = async (): Promise<void> => {
  // sync all db addresses transactions
  const initTransactionsSync = new Queue('initTransactionsSync', { connection: redis })

  // sync current prices
  const initPricesSync = new Queue('initPricesSync', { connection: redis })

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
      },
      {
        name: 'syncCurrentPrices',
        data: {},
        opts: { removeOnFail: false, jobId: 'syncCurrentPrices' },
        queueName: initPricesSync.name
      }
    ]
  })

  await syncCurrentPricesWorker(initPricesSync.name)
  await syncAllAddressTransactionsForNetworkWorker(initTransactionsSync.name)
  await syncUnsyncedAddressesWorker(newAddressesSync)
}

void main()
