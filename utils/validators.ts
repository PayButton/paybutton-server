import { RESPONSE_MESSAGES, SUPPORTED_ADDRESS_PATTERN, NETWORK_TICKERS } from '../constants/index'
import { Prisma } from '@prisma/client'
import config from '../config/index'
import { type CreatePaybuttonInput, type UpdatePaybuttonInput } from '../services/paybuttonService'
import { type CreateWalletInput, type UpdateWalletInput } from '../services/walletService'
import { getAddressPrefix } from './index'
import xecaddr from 'xecaddrjs'

/* The functions exported here should validate the data structure / syntax of an
 * input by throwing an error in case something is different from the expected.
 * The prefix for each function name * here defined shall be:
 * - 'parse', if the function validates the input and transforms it into another output;
 * - 'validate', if the function only validates the input and returns `true` or `false`.
--------------------------------------------------------------------------------------- */

/* Validates the address and adds a prefix to it, if it does not have it already.
    Also removes duplicated addresses.
 */
const parseAddressTextBlock = function (addressBlock: string): string[] {
  return addressBlock.trim()
    .split('\n')
    .map((addr) => parseAddress(addr.trim()))
    .filter((value, index, self) => self.indexOf(value) === index)
}

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
    switch (error.code) {
      case 'P2002':
        if (error.message.includes('Paybutton_name_providerUserId_unique_constraint')) {
          return new Error(RESPONSE_MESSAGES.PAYBUTTON_NAME_ALREADY_EXISTS_400.message)
        } else if (error.message.includes('Wallet_name_providerUserId_unique_constraint')) {
          return new Error(RESPONSE_MESSAGES.WALLET_NAME_ALREADY_EXISTS_400.message)
        } else if (error.message.includes('Transaction_hash_addressId_key')) {
          return new Error(RESPONSE_MESSAGES.TRANSACTION_ALREADY_EXISTS_FOR_ADDRESS_400.message)
        }
        break
      case 'P2025':
        if (
          error.message.includes('prisma.paybutton.delete') ||
          error.message.includes('prisma.paybutton.update') ||
          error.message.includes('No Paybutton found')
        ) {
          return new Error(RESPONSE_MESSAGES.NO_BUTTON_FOUND_404.message)
        } else if (
          error.message.includes('prisma.address.update')
        ) {
          return new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message)
        } else if (
          error.message.includes('prisma.transaction.delete')
        ) {
          return new Error(RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404.message)
        }
        break
    }
  }
  return error
}

export interface PaybuttonPOSTParameters {
  userId?: string
  walletId?: string
  name?: string
  buttonData?: string
  addresses?: string
}

export const parsePaybuttonPOSTRequest = function (params: PaybuttonPOSTParameters): CreatePaybuttonInput {
  if (params.userId === '' || params.userId === undefined) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  if (params.name === '' || params.name === undefined) throw new Error(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
  if (params.addresses === '' || params.addresses === undefined) throw new Error(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message)
  if (params.walletId === '' || params.walletId === undefined) {
    throw new Error(RESPONSE_MESSAGES.WALLET_ID_NOT_PROVIDED_400.message)
  }
  const walletId = params.walletId

  const parsedAddresses = parseAddressTextBlock(params.addresses)
  const parsedButtonData = parseButtonData(params.buttonData)
  return {
    userId: params.userId,
    name: params.name,
    buttonData: parsedButtonData,
    prefixedAddressList: parsedAddresses,
    walletId
  }
}

export interface WalletPOSTParameters {
  userId?: string
  name?: string
  isXECDefault?: boolean
  isBCHDefault?: boolean
  addressIdList: string[]
}

export interface PaybuttonPATCHParameters {
  name?: string
  addresses?: string
  userId?: string
}

export interface WalletPATCHParameters {
  name: string
  userId?: string
  isXECDefault?: boolean
  isBCHDefault?: boolean
  addressIdList: string[]
}

export const parseWalletPOSTRequest = function (params: WalletPOSTParameters): CreateWalletInput {
  if (params.userId === '' || params.userId === undefined) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  if (params.name === '' || params.name === undefined) throw new Error(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
  return {
    userId: params.userId,
    name: params.name,
    addressIdList: params.addressIdList,
    isXECDefault: params.isXECDefault,
    isBCHDefault: params.isBCHDefault
  }
}

export const parseWalletPATCHRequest = function (params: WalletPATCHParameters): UpdateWalletInput {
  if (params.userId === '' || params.userId === undefined) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  if (params.name === '' || params.name === undefined) throw new Error(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
  return {
    name: params.name,
    userId: params.userId,
    addressIdList: params.addressIdList,
    isXECDefault: params.isXECDefault,
    isBCHDefault: params.isBCHDefault
  }
}

export const parsePaybuttonPATCHRequest = function (params: PaybuttonPATCHParameters, paybuttonId: string): UpdatePaybuttonInput {
  if (params.userId === '' || params.userId === undefined) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  const ret: UpdatePaybuttonInput = {
    name: params.name,
    userId: params.userId,
    paybuttonId
  }

  if (params.addresses !== '' && params.addresses !== undefined) {
    ret.prefixedAddressList = parseAddressTextBlock(params.addresses)
  }
  return ret
}

export const validateNetworkTicker = function (networkTicker: string): void {
  if (!Object.values(NETWORK_TICKERS).includes(networkTicker)) {
    throw new Error(RESPONSE_MESSAGES.INVALID_TICKER_400.message)
  }
}

export const validatePriceAPIUrlAndToken = function (): void {
  if (config.priceAPIURL === '') {
    throw new Error(RESPONSE_MESSAGES.MISSING_PRICE_API_URL_400.message)
  }
  if (process.env.PRICE_API_TOKEN === '' || process.env.PRICE_API_TOKEN === undefined) {
    console.log('temp1', process.env)
    throw new Error(RESPONSE_MESSAGES.MISSING_PRICE_API_TOKEN_400.message)
  }
}

export interface WSGETParameters {
  addresses: string[]
}
