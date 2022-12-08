import { syncAllAddressTransactions } from './jobs'

const main = async (): Promise<void> => {
  void await syncAllAddressTransactions()
}

void main()
