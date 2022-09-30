import { RESPONSE_MESSAGES, SUPPORTED_ADDRESS_PATTERN } from '../constants/index'
import { Prisma } from '@prisma/client'
import { CreatePaybuttonInput } from '../services/paybuttonService'
import { getAddressPrefix } from './index'
import xecaddr from 'xecaddrjs'

/* The functions exported here should validate the data structure / syntax of an
 * input by throwing an error in case something is different from the expected.
 * The prefix for each function name * here defined shall be:
 * - 'parse', if the function validates the input and transforms it into another output;
 * - 'validate', if the function only validates the input and returns `true` or `false`.
--------------------------------------------------------------------------------------- */

/* Validates the address and adds a prefix to it, if it does not have it already.
 */
export const parseAddress = function (addressString: string | undefined): string {
  if (addressString === '' || addressString === undefined) throw new Error(RESPONSE_MESSAGES.ADDRESS_NOT_PROVIDED_400.message)
  let parsedAddress: string
  if (
    addressString.match(SUPPORTED_ADDRESS_PATTERN) != null &&
      xecaddr.isValidAddress(addressString.toLowerCase()) as boolean
  ) {
    if (addressString.includes(':')) {
      parsedAddress = addressString
    } else {
      const prefix = getAddressPrefix(addressString.toLowerCase())
      parsedAddress = `${prefix}:${addressString}`
    }
  } else {
    throw new Error(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  }
  return parsedAddress.toLowerCase()
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
  if (params.addresses === '' || params.addresses === undefined) throw new Error(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message)
  const parsedAddresses = params.addresses.trim().split('\n').map((addr) => parseAddress(addr))
  const parsedButtonData = parseButtonData(params.buttonData)
  return {
    userId: params.userId,
    name: params.name,
    buttonData: parsedButtonData,
    prefixedAddressList: parsedAddresses
  }
}
