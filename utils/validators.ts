import { SUPPORTED_CHAINS, SUPPORTED_ADDRESS_PATTERN, RESPONSE_MESSAGES } from 'constants/index'

/* The prefix for each function here defined shall be:
 * - 'parse', if the function validates the input and also uses it to create some other output;
 * - 'validate', if the function only validates the input
 */

export const parseAddresses = function (prefixedAddressString: string | undefined): string[] {
  /**
   * Disallow addresses without a 'chain:' prefix
   * Disallow addresses with an unknown prefix
   * Disallow  addresses is in an invalid format
   * Disallow  addresses with repeated prefixes (chains)
   **/
  if (prefixedAddressString === '' || prefixedAddressString === undefined) {
    throw new Error(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message)
  }
  const prefixedAddressList = prefixedAddressString.trim().split('\n')
  const seenPrefixes = new Set()
  for (let i = 0; i < prefixedAddressList.length; i++) {
    const addressWithPrefix = prefixedAddressList[i]
    let [prefix, address] = addressWithPrefix.split(':')
    prefix = prefix.toLowerCase()
    if (
      !addressWithPrefix.includes(':') ||
      !SUPPORTED_CHAINS.includes(prefix) ||
      (address.match(SUPPORTED_ADDRESS_PATTERN) == null) ||
      seenPrefixes.has(prefix)
    ) {
      throw new Error(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
    }
    seenPrefixes.add(prefix)
  }
  return prefixedAddressList
}

export const validateButtonData = function (buttonDataString: string | undefined): void {
  if (buttonDataString !== '' && buttonDataString !== undefined) {
    try {
      JSON.parse(buttonDataString)
    } catch (e: any) {
      throw new Error(RESPONSE_MESSAGES.INVALID_BUTTON_DATA_400.message)
    }
  }
}
