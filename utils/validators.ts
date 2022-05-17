import { supportedChains, supportedAddressesPattern } from 'constants/index'

export const validateAddresses = function (prefixedAddressList: string[]): boolean {
  /**
   * Disallow addresses without a 'chain:' prefix
   * Disallow addresses with an unknown prefix
   * Disallow  addresses is in an invalid format
   * Disallow  addresses with repeated prefixes (chains)
   **/
  let seenPrefixes = new Set()
  for (let i = 0; i < prefixedAddressList.length; i++) {
    const addressWithPrefix = prefixedAddressList[i];
    const [prefix, address] =  addressWithPrefix.split(':')
    if(
      !addressWithPrefix.includes(':')
      || !supportedChains.includes(prefix)
      || !address.match(supportedAddressesPattern)
      || seenPrefixes.has(prefix)
    ) {
      return false
    }
    seenPrefixes.add(prefix)
  }
  return prefixedAddressList.length ? true : false
}
