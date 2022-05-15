import { supportedChains, supportedAddressesPattern } from 'types/constants'

export const validateAddresses = function (prefixedAddressList: string[]): boolean {
  /**
   * Disallow addresses without a 'chain:' prefix
   * Disallow addresses with an unknown prefix
   * Disallow  addresses is in an invalid format
   **/
  for (let i = 0; i < prefixedAddressList.length; i++) {
    const addressWithPrefix = prefixedAddressList[i];
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
} // WIP unittests
