import { SUPPORTED_CHAINS, SUPPORTED_ADDRESS_PATTERN } from 'constants/index'
import { RESPONSE_MESSAGES } from 'constants/index'

export const parseAddresses = function (prefixedAddressString: string): string[] {
  /**
   * Disallow addresses without a 'chain:' prefix
   * Disallow addresses with an unknown prefix
   * Disallow  addresses is in an invalid format
   * Disallow  addresses with repeated prefixes (chains)
   **/
  if (!prefixedAddressString) throw new Error(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message);
  const prefixedAddressList = prefixedAddressString.trim().split('\n')
  let seenPrefixes = new Set()
  for (let i = 0; i < prefixedAddressList.length; i++) {
    const addressWithPrefix = prefixedAddressList[i];
    let [prefix, address] =  addressWithPrefix.split(':')
    prefix = prefix.toLowerCase()
    if(
      !addressWithPrefix.includes(':')
      || !SUPPORTED_CHAINS.includes(prefix)
      || !address.match(SUPPORTED_ADDRESS_PATTERN)
      || seenPrefixes.has(prefix)
    ) {
      throw new Error(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
    }
    seenPrefixes.add(prefix)
  }
  return prefixedAddressList
}
