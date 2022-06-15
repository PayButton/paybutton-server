import { SUPPORTED_CHAINS, SUPPORTED_ADDRESS_PATTERN, RESPONSE_MESSAGES } from 'constants/index'
import { Prisma } from '@prisma/client'
import { CreatePaybuttonInput } from 'services/paybuttonsService'

/* The functions here defined should validate the data structure / syntax of an input by throwing
 * an error in case something is different from the expected. The prefix for each function name
 * here defined shall be:
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

export const parseButtonData = function (buttonDataString: string | undefined): string {
  let parsedButtonData: string
  if (buttonDataString === '' || buttonDataString === undefined) {
    parsedButtonData = '{}'
  } else {
    try {
      const jsonObject = JSON.parse(buttonDataString)
      parsedButtonData = JSON.stringify(jsonObject, null, 0) // remove linebreaks, tabs & spaces.
    } catch (e: any) {
      throw new Error(RESPONSE_MESSAGES.INVALID_BUTTON_DATA_400.message)
    }
  }
  return parsedButtonData
}

export const parseError = function (error: Error): Error {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      if (error.message.includes('Paybutton_name_providerUserId_unique_constraint')) {
        return new Error(RESPONSE_MESSAGES.NAME_ALREADY_EXISTS_400.message)
      }
    }
  }
  return error
}

export interface POSTParameters {
  userId?: string
  name?: string
  buttonData?: string
  addresses?: string
}

export const parsePaybuttonPOSTRequest = function (params: POSTParameters): CreatePaybuttonInput {
  if (params.userId === '' || params.userId === undefined) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  if (params.name === '' || params.name === undefined) throw new Error(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
  const parsedAddresses = parseAddresses(params.addresses)
  const parsedButtonData = parseButtonData(params.buttonData)
  return {
    userId: params.userId,
    name: params.name,
    buttonData: parsedButtonData,
    prefixedAddressList: parsedAddresses
  }
}
