import { supportedChains, supportedAddressesPattern } from 'types/constants'

export const validateInput = function (value: string): boolean {
  /**
   * Disallow addresses without a 'chain:' prefix
   * Disallow addresses with an unknown prefix
   * Disallow  addresses is in an invalid format
   * */
  if (value) {
    const addressList = value.trim().split('\n')
    for (let i = 0; i < addressList.length; i++) {
      const addressWithPrefix = addressList[i];
      const [prefix, address] =  addressWithPrefix.split(':')
      if(
        !addressWithPrefix.includes(':')
        || !supportedChains.includes(prefix)
        || !address.match(supportedAddressesPattern)
      ) {
        return false
      }
    }
    return true
  }
} // WIP unittests
