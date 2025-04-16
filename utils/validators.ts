import { RESPONSE_MESSAGES, SUPPORTED_ADDRESS_PATTERN, NETWORK_TICKERS, TRIGGER_POST_VARIABLES, EMAIL_REGEX } from '../constants/index'
import { Prisma } from '@prisma/client'
import config from '../config/index'
import { type CreatePaybuttonInput, type UpdatePaybuttonInput } from '../services/paybuttonService'
import { type CreateWalletInput, type UpdateWalletInput } from '../services/walletService'
import { getAddressPrefix, parseWebsiteURL } from './index'
import xecaddr from 'xecaddrjs'
import { CreatePaybuttonTriggerInput, PostDataParameters } from 'services/triggerService'
import crypto from 'crypto'
import { getUserPrivateKey } from '../services/userService'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import moment from 'moment-timezone'

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
  if (error instanceof PrismaClientKnownRequestError) {
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
        if (error.meta?.modelName === 'Paybutton') {
          return new Error(RESPONSE_MESSAGES.NO_BUTTON_FOUND_404.message)
        } else if (error.meta?.modelName === 'Address') {
          return new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message)
        } else if (error.meta?.modelName === 'Transaction') {
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

export interface UpdatePreferredCurrencyInput {
  currencyId: number
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
  postURL?: string
  postData?: string
  isEmailTrigger: boolean
  currentTriggerId?: string
  emails?: string
}

export interface PaybuttonTriggerParseParameters {
  userId: string
  postData: string
  postDataParameters: PostDataParameters
}

interface TriggerSignature {
  payload: string
  signature: string
}

function getSignaturePayload (postData: string, postDataParameters: PostDataParameters): string {
  const includedVariables = TRIGGER_POST_VARIABLES.filter(v => postData.includes(v)).sort()
  return includedVariables.map(varString => {
    const key = varString.replace('<', '').replace('>', '') as keyof PostDataParameters
    let valueString = ''
    if (key === 'opReturn') {
      const value = postDataParameters[key]
      valueString = `${value.message}+${value.paymentId}`
    } else {
      valueString = postDataParameters[key] as string
    }
    return valueString
  }).join('+')
}

export function signPostData ({ userId, postData, postDataParameters }: PaybuttonTriggerParseParameters): TriggerSignature {
  const payload = getSignaturePayload(postData, postDataParameters)
  const pk = getUserPrivateKey(userId)
  const signature = crypto.sign(
    null,
    Buffer.from(payload),
    pk
  )
  return {
    payload,
    signature: signature.toString('hex')
  }
}

export function parseTriggerPostData ({ userId, postData, postDataParameters }: PaybuttonTriggerParseParameters): any {
  try {
    const buttonName = JSON.stringify(postDataParameters.buttonName)
    const opReturn = JSON.stringify(postDataParameters.opReturn, undefined, 2)
    const signature = signPostData({ userId, postData, postDataParameters })
    const resultingData = postData
      .replace('<amount>', postDataParameters.amount.toString())
      .replace('<currency>', `"${postDataParameters.currency}"`)
      .replace('<txId>', `"${postDataParameters.txId}"`)
      .replace('<buttonName>', buttonName)
      .replace('<address>', `"${postDataParameters.address}"`)
      .replace('<timestamp>', postDataParameters.timestamp.toString())
      .replace('<opReturn>', opReturn)
      .replace('<signature>', `${JSON.stringify(signature, undefined, 2)}`)
      .replace('<inputAddresses>', `${JSON.stringify(postDataParameters.inputAddresses, undefined, 2)}`)
      .replace('<value>', `"${postDataParameters.value}"`)

    const parsedResultingData = JSON.parse(resultingData)
    return parsedResultingData
  } catch (err: any) {
    const includedVariables = TRIGGER_POST_VARIABLES.filter(v => postData.includes(v))
    if (includedVariables.length > 0) {
      throw new Error(RESPONSE_MESSAGES.INVALID_DATA_JSON_WITH_VARIABLES_400(includedVariables).message)
    }
    throw new Error(RESPONSE_MESSAGES.INVALID_DATA_JSON_400.message)
  }
}

export const parsePaybuttonTriggerPOSTRequest = function (params: PaybuttonTriggerPOSTParameters): CreatePaybuttonTriggerInput {
  // userId
  if (params.userId === '' || params.userId === undefined) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)

  // emails
  if (params.emails !== undefined && params.emails !== '' && !isEmailValid(params.emails)) {
    throw new Error(RESPONSE_MESSAGES.INVALID_EMAIL_400.message)
  }

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
    const dummyPostDataParameters = {
      amount: new Prisma.Decimal(0),
      currency: '',
      txId: '',
      buttonName: '',
      address: '',
      timestamp: 0,
      opReturn: EMPTY_OP_RETURN,
      inputAddresses: [],
      value: ''
    }
    const parsed = parseTriggerPostData({
      userId: params.userId,
      postData: params.postData,
      postDataParameters: dummyPostDataParameters
    })
    if (parsed === null || typeof parsed !== 'object') {
      throw new Error(RESPONSE_MESSAGES.INVALID_DATA_JSON_400.message)
    }
    postData = params.postData
  }

  if (
    !params.isEmailTrigger &&
    (postData === undefined || postURL === undefined)
  ) {
    throw new Error(RESPONSE_MESSAGES.POST_URL_AND_DATA_MUST_BE_SET_TOGETHER_400.message)
  }

  if (
    params.isEmailTrigger &&
    (params.emails === '' || params.emails === undefined)
  ) {
    throw new Error(RESPONSE_MESSAGES.MISSING_EMAIL_FOR_TRIGGER_400.message)
  }

  return {
    emails: params.emails,
    postURL,
    postData,
    userId: params.userId,
    isEmailTrigger: params.isEmailTrigger
  }
}

const isEmailValid = (email?: string): boolean => {
  if (email === undefined) return false
  return EMAIL_REGEX.test(email)
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

export interface OpReturnData {
  rawMessage: string
  message: string
  paymentId: string
}

export const EMPTY_OP_RETURN: OpReturnData = {
  rawMessage: '',
  message: '',
  paymentId: ''
}

function splitAtFirst (str: string, separator: string): string[] {
  const index = str.indexOf(separator)
  if (index === -1) { return [str] };
  return [str.slice(0, index), str.slice(index + separator.length)]
}

// We try to parse the opReturn string from k=v space-separated
// pairs to  { [k] = v} . We also try to parse each
// key has the unparsable string as value.
export function parseOpReturnData (opReturnData: string): any {
  const dataObject: any = {}
  // Try to parse it as JSON first, excluding simple numbers
  try {
    const jsonParsed = JSON.parse(opReturnData)
    if (typeof jsonParsed === 'number') {
      throw new Error()
    }
    return jsonParsed
  } catch {}

  // Try to parse it as k=v pairs
  try {
    const keyValuePairs = opReturnData.split(' ')
    for (const kvString of keyValuePairs) {
      const splitted = splitAtFirst(kvString, '=')
      if (splitted[1] === undefined || splitted[1] === '' || splitted[0] === '') {
        return parseStringToArray(opReturnData)
      }
      const key = splitted[0]
      const value = parseStringToArray(splitted[1])
      // (parse value as array)
      dataObject[key] = value
    }
    return dataObject
  } catch (err: any) {
    return parseStringToArray(opReturnData)
  }
}

export const exportedForTesting = {
  getSignaturePayload
}

export interface CreateOrganizationPOSTParameters {
  creatorId?: string
  name?: string
}

export interface CreateOrganizationInput {
  creatorId: string
  name: string
}

export interface UpdateOrganizationPUTParameters {
  userId?: string
  name?: string
}

export interface UpdateOrganizationInput {
  userId: string
  name: string
}

export interface JoinOrganizationPOSTParameters {
  userId?: string
  token?: string
}

export interface JoinOrganizationInput {
  userId: string
  token: string
}

export interface UpdatePreferredCurrencyPUTParameters {
  currencyId?: string | number
}

export interface UpdateUserTimezonePUTParameters {
  timezone: string
}

export const parseJoinOrganizationPOSTRequest = function (params: JoinOrganizationPOSTParameters): JoinOrganizationInput {
  if (params.userId === '' || params.userId === undefined) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  if (params.token === '' || params.token === undefined) throw new Error(RESPONSE_MESSAGES.INVITATION_TOKEN_NOT_PROVIDED_400.message)
  return {
    userId: params.userId,
    token: params.token
  }
}

export const parseUpdateOrganizationPUTRequest = function (params: UpdateOrganizationPUTParameters): UpdateOrganizationInput {
  if (params.userId === '' || params.userId === undefined) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  if (params.name === '' || params.name === undefined) throw new Error(RESPONSE_MESSAGES.ORGANIZATION_NAME_NOT_PROVIDED_400.message)
  return {
    userId: params.userId,
    name: params.name
  }
}

export const parseCreateOrganizationPOSTRequest = function (params: CreateOrganizationPOSTParameters): CreateOrganizationInput {
  if (params.creatorId === '' || params.creatorId === undefined) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  if (params.name === '' || params.name === undefined) throw new Error(RESPONSE_MESSAGES.ORGANIZATION_NAME_NOT_PROVIDED_400.message)
  return {
    creatorId: params.creatorId,
    name: params.name
  }
}

export const parseUpdatePUTRequest = function (params: UpdatePreferredCurrencyPUTParameters): UpdatePreferredCurrencyInput {
  if (params.currencyId === '' ||
    params.currencyId === undefined
  ) {
    throw new Error(RESPONSE_MESSAGES.INVALID_PASSWORD_FORM_400.message)
  }

  return {
    currencyId: Number(params.currencyId)
  }
}

export const parseUpdateUserTimezonePUTRequest = function (params: UpdateUserTimezonePUTParameters): UpdateUserTimezonePUTParameters {
  if (params.timezone === '' ||
    params.timezone === undefined ||
    !moment.tz.names().includes(params.timezone)) {
    throw new Error(RESPONSE_MESSAGES.INVALID_TIMEZONE_FORM_400.message)
  }

  return { timezone: params.timezone }
}
