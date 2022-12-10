import { XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'
import { Queue } from 'bullmq'
import { redis } from 'redis/clientInstance'
import {
  syncAllAddressTransactionsForNetworkWorker,
  syncCurrentPricesWorker
} from './workers'

const main = async (): Promise<void> => {
  // sync all db addresses transactions
  const initTransactionsSync = new Queue('initTransactionsSync', { connection: redis })
  void initTransactionsSync.addBulk([
    {
      name: 'sync xec addresses',
      data: { networkId: XEC_NETWORK_ID },
      opts: { removeOnComplete: true, removeOnFail: true }
    },
    {
      name: 'sync bch addresses',
      data: { networkId: BCH_NETWORK_ID },
      opts: { removeOnComplete: true, removeOnFail: true }
    }
  ])
  await syncAllAddressTransactionsForNetworkWorker(initTransactionsSync.name)

  // sync current prices
  const initPricesSync = new Queue('initPricesSync', { connection: redis })
  void initPricesSync.add('sync current prices', {}, { removeOnComplete: true, removeOnFail: true })
  await syncCurrentPricesWorker(initPricesSync.name)
}

void main()
