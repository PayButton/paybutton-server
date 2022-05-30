import { SUPPORTED_CHAINS, SUPPORTED_ADDRESS_PATTERN } from 'constants/index'
import { RESPONSE_MESSAGES } from 'constants/index'

export const validateAddresses = function (prefixedAddressList: string[]): void {
  /**
   * Disallow addresses without a 'chain:' prefix
   * Disallow addresses with an unknown prefix
   * Disallow  addresses is in an invalid format
   * Disallow  addresses with repeated prefixes (chains)
   **/
  let seenPrefixes = new Set()
  if (!prefixedAddressList.length) throw new Error(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message);
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
}
