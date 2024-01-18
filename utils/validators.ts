import { RESPONSE_MESSAGES, SUPPORTED_ADDRESS_PATTERN, NETWORK_TICKERS } from '../constants/index'
import { Prisma } from '@prisma/client'
import config from '../config/index'
import { type CreatePaybuttonInput, type UpdatePaybuttonInput } from '../services/paybuttonService'
import { type CreateWalletInput, type UpdateWalletInput } from '../services/walletService'
import { getAddressPrefix, parseWebsiteURL } from './index'
import xecaddr from 'xecaddrjs'
import { CreatePaybuttonTriggerInput, PostDataParametersHashed } from 'services/triggerService'

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

export interface SignUpPasswordPOSTParameters {
  password?: string
  passwordConfirmed?: string
}

export interface ChangePasswordPOSTParameters {
  oldPassword?: string
  newPassword?: string
  newPasswordConfirmed?: string
}

export interface ChangePasswordInput {
  oldPassword: string
  newPassword: string
}

export const parseChangePasswordPOSTRequest = function (params: ChangePasswordPOSTParameters): ChangePasswordInput {
  if (
    params.newPassword !== params.newPasswordConfirmed ||
    params.oldPassword === '' ||
    params.oldPassword === undefined ||
    params.newPassword === '' ||
    params.newPassword === undefined ||
    params.newPasswordConfirmed === '' ||
    params.newPasswordConfirmed === undefined
  ) {
    throw new Error(RESPONSE_MESSAGES.INVALID_PASSWORD_FORM_400.message)
  }

  return {
    oldPassword: params.oldPassword,
    newPassword: params.newPassword
  }
}

export interface PaybuttonPOSTParameters {
  userId?: string
  walletId?: string
  name?: string
  buttonData?: string
  addresses?: string
  url?: string
  description?: string
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
  const parsedURL = (params.url === '' || params.url === undefined) ? '' : parseWebsiteURL(params.url)

  return {
    userId: params.userId,
    name: params.name,
    buttonData: parsedButtonData,
    prefixedAddressList: parsedAddresses,
    walletId,
    url: parsedURL,
    description: params.description ?? ''
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
  url?: string
  description?: string
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

export interface PaybuttonTriggerPOSTParameters {
  userId?: string
  sendEmail?: boolean
  postURL?: string
  postData?: string
  currentTriggerId?: string
}

const triggerPostVariables = ['<amount>', '<currency>', '<txId>', '<buttonName>', '<address>', '<timestamp>', '<opReturn>', '<hmac>']

export function parseTriggerPostData (postData: string, postDataParametersHashed?: PostDataParametersHashed): any {
  let resultingData: string
  // Allows to test the validity of postData without data to replace
  if (postDataParametersHashed === undefined) {
    postDataParametersHashed = {
      amount: new Prisma.Decimal(0),
      currency: '',
      txId: '',
      buttonName: '',
      address: '',
      timestamp: 0,
      opReturn: EMPTY_OP_RETURN,
      hmac: ''
    }
  }
  try {
    const buttonName = JSON.stringify(postDataParametersHashed.buttonName)
    const opReturn = JSON.stringify(postDataParametersHashed.opReturn, undefined, 2)
    resultingData = postData
      .replace('<amount>', postDataParametersHashed.amount.toString())
      .replace('<currency>', `"${postDataParametersHashed.currency}"`)
      .replace('<txId>', `"${postDataParametersHashed.txId}"`)
      .replace('<buttonName>', buttonName)
      .replace('<address>', `"${postDataParametersHashed.address}"`)
      .replace('<timestamp>', postDataParametersHashed.timestamp.toString())
      .replace('<opReturn>', opReturn)
      .replace('<hmac>', `"${postDataParametersHashed.hmac}"`)
    const parsedResultingData = JSON.parse(resultingData)
    return parsedResultingData
  } catch (err: any) {
    console.log('cathing err', err.name, err.message, err.stack)
    const includedVariables = triggerPostVariables.filter(v => postData.includes(v))
    if (includedVariables.length > 0) {
      throw new Error(RESPONSE_MESSAGES.INVALID_DATA_JSON_WITH_VARIABLES_400(includedVariables).message)
    }
    throw new Error(RESPONSE_MESSAGES.INVALID_DATA_JSON_400.message)
  }
}

export const parsePaybuttonTriggerPOSTRequest = function (params: PaybuttonTriggerPOSTParameters): CreatePaybuttonTriggerInput {
  // userId
  if (params.userId === '' || params.userId === undefined) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)

  // postURL
  let postURL: string | undefined
  if (params.postURL === undefined || params.postURL === '') { postURL = undefined } else {
    try {
      const parsed = new URL(params.postURL)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
      postURL = params.postURL
    } catch (_) {
      throw new Error(RESPONSE_MESSAGES.INVALID_URL_400.message)
    }
  }

  // postData
  let postData: string | undefined
  if (params.postData === undefined || params.postData === '') { postData = undefined } else {
    const parsed = parseTriggerPostData(params.postData)
    if (parsed === null || typeof parsed !== 'object') {
      throw new Error(RESPONSE_MESSAGES.INVALID_DATA_JSON_400.message)
    }
    postData = params.postData
  }

  if ((postData === undefined || postURL === undefined)) {
    throw new Error(RESPONSE_MESSAGES.POST_URL_AND_DATA_MUST_BE_SET_TOGETHER_400.message)
  }

  return {
    sendEmail: params.sendEmail === true,
    postURL,
    postData,
    userId: params.userId
  }
}

export const parsePaybuttonPATCHRequest = function (params: PaybuttonPATCHParameters, paybuttonId: string): UpdatePaybuttonInput {
  if (params.userId === '' || params.userId === undefined) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  const parsedURL = (params.url === '' || params.url === undefined) ? '' : parseWebsiteURL(params.url)
  const ret: UpdatePaybuttonInput = {
    name: params.name,
    userId: params.userId,
    paybuttonId,
    description: params.description ?? '',
    url: parsedURL
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
    throw new Error(RESPONSE_MESSAGES.MISSING_PRICE_API_TOKEN_400.message)
  }
}

export interface WSGETParameters {
  addresses: string[]
}

// We look for | as separators, except if they are preceeded by a backslash.
// In that case, we return the string without the backslash
// In the other case, we return an array.
export function parseStringToArray (str: string): string | string[] {
  const pattern = /(?<!\\)\|/
  // Split the input string using the pattern
  const splitted = str.split(pattern)
  if (splitted.length > 1) {
    return splitted.map(s => s.replace('\\|', '|'))
  }
  return str.replace('\\|', '|')
}
function getSimpleOpReturnObject (paymentId: string, data: string): OpReturnBroadcastData {
  return {
    paymentId,
    data: parseStringToArray(data)
  }
}

export interface OpReturnData {
  data: string
  paymentId: string
}

export const EMPTY_OP_RETURN: OpReturnData = {
  data: '',
  paymentId: ''
}

interface OpReturnBroadcastData {
  data: any
  paymentId: string
}

// We try to parse the opReturn string from k=v space-separated
// pairs to  { [k] = v} . We also try to parse each
// key has the unparsable string as value.
export function parseOpReturnData (opReturn: string): OpReturnBroadcastData {
  if (opReturn === '') {
    return EMPTY_OP_RETURN
  }

  const { paymentId, data }: OpReturnData = JSON.parse(opReturn)
  const dataObject: any = {}
  try {
    const keyValuePairs = data.split(' ')
    for (const kvString of keyValuePairs) {
      const splitted = kvString.split('=')
      if (splitted[1] === undefined || splitted[1] === '' || splitted[0] === '') {
        return getSimpleOpReturnObject(paymentId, data)
      }
      const key = splitted[0]
      const value = parseStringToArray(splitted[1])
      // (parse value as array)
      dataObject[key] = value
    }
    return {
      paymentId,
      data: dataObject
    }
  } catch (err: any) {
    return getSimpleOpReturnObject(paymentId, data)
  }
}
