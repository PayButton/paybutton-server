import xecaddr from 'xecaddrjs'
import { Prisma, UserProfile } from '@prisma/client'
import { RESPONSE_MESSAGES, NETWORK_SLUGS, NetworkSlugsType, USD_QUOTE_ID } from '../constants/index'
import * as bitcoinjs from 'bitcoinjs-lib'
import { NextApiRequest, NextApiResponse } from 'next'
import { URL } from 'url'
import { QuoteValues } from 'services/priceService'

export const removeAddressPrefix = function (addressString: string): string {
  if (addressString.includes(':')) {
    return addressString.split(':')[1]
  }
  return addressString
}

export const getAddressPrefix = function (addressString: string): NetworkSlugsType {
  try {
    const format = xecaddr.detectAddressFormat(addressString)
    const network = xecaddr.detectAddressNetwork(addressString)
    if (format === xecaddr.Format.Xecaddr) {
      if (network === xecaddr.Network.Mainnet) {
        return NETWORK_SLUGS.ecash as NetworkSlugsType
      } else if (network === xecaddr.Network.Testnet) {
        return NETWORK_SLUGS.ectest as NetworkSlugsType
      }
    } else if (format === xecaddr.Format.Cashaddr) {
      if (network === xecaddr.Network.Mainnet) {
        return NETWORK_SLUGS.bitcoincash as NetworkSlugsType
      } else if (network === xecaddr.Network.Testnet) {
        return NETWORK_SLUGS.bchtest as NetworkSlugsType
      }
    }
  } catch {
    throw new Error(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  }
  throw new Error(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
}

export const getAddressPrefixed = function (addressString: string): string {
  return `${getAddressPrefix(addressString)}:${removeAddressPrefix(addressString)}`
}

export async function satoshisToUnit (satoshis: bigint, networkFormat: string): Promise<Prisma.Decimal> {
  const decimal = new Prisma.Decimal(satoshis.toString())
  if (networkFormat === xecaddr.Format.Xecaddr) {
    return decimal.dividedBy(1e2)
  } else if (networkFormat === xecaddr.Format.Cashaddr) {
    return decimal.dividedBy(1e8)
  }
  throw new Error(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
}

export async function pubkeyToAddress (pubkeyString: string, networkFormat: string): Promise<string | undefined> {
  const pubkey = Buffer.from(pubkeyString, 'hex')
  let legacyAddress: string | undefined
  try {
    legacyAddress = bitcoinjs.payments.p2pkh({ pubkey })?.address
  } catch (err) {
    return undefined
  }

  let address: string
  switch (networkFormat) {
    case xecaddr.Format.Xecaddr:
      address = await xecaddr.toXecAddress(legacyAddress)
      break
    case xecaddr.Format.Cashaddr:
      address = await xecaddr.toCashAddress(legacyAddress)
      break
    default:
      throw new Error(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  }
  return address
}

const findFirstSignificantDigit = (floatNumber: number): number | undefined => {
  if (floatNumber <= 0) {
    return undefined
  }
  let ret = 0
  while (floatNumber < 1) {
    floatNumber = floatNumber * 10
    ret++
  }
  return ret
}

export const formatQuoteValue = (numberString: string | QuoteValues | number, quoteId?: number): string => {
  let parsedFloat: number
  if (typeof numberString === 'object' && 'usd' in numberString) {
    parsedFloat = quoteId === USD_QUOTE_ID ? Number(numberString.usd) : Number(numberString.cad)
  } else if (typeof numberString === 'string') {
    parsedFloat = parseFloat(numberString)
  } else {
    parsedFloat = numberString
  }

  let minDigits: number
  let maxDigits: number
  if (quoteId !== undefined) {
    minDigits = 2
    if (parsedFloat < 0.01) {
      maxDigits = findFirstSignificantDigit(parsedFloat) ?? 2
    } else {
      maxDigits = 2
    }
  } else {
    return parsedFloat.toLocaleString()
  }
  return parsedFloat.toLocaleString(
    undefined,
    {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits
    }
  )
}

export async function readCsv (fsModule: any, filePath: string): Promise<string[][]> {
  const data = await fsModule.promises.readFile(filePath, 'utf8')
  return data.split('\n').map((row: string) => row.split(','))
}

export async function fileExists (fsModule: any, filePath: string): Promise<boolean> {
  try {
    await fsModule.promises.stat(filePath)
    return true
  } catch (error) {
    return false
  }
}

export function isEmpty (value: string): boolean {
  return value === '' || value === null || value === undefined
}

export async function runMiddleware (
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
): Promise<any> {
  return await new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result)
      }

      return resolve(result)
    })
  })
}

export function parseWebsiteURL (url: string): string {
  const domainPattern = /\.[a-zA-Z]{2,}$/
  const tryParse = (prefix: string): string => {
    let parsed: URL
    try {
      parsed = new URL(prefix + url)
      if (
        domainPattern.test(parsed.hostname) &&
        ['http:', 'https:'].includes(parsed.protocol)
      ) {
        return parsed.toString()
      }
    } catch (_) {}
    return ''
  }

  const unprefixedURL = tryParse('')
  if (unprefixedURL !== '') {
    return unprefixedURL
  }

  const prefixedURL = tryParse('https://')
  if (prefixedURL !== '') {
    return prefixedURL
  }

  throw new Error(RESPONSE_MESSAGES.INVALID_WEBSITE_URL_400.message)
}

export function arraysAreEqual (a: any[], b: any[]): boolean {
  if (a.length !== b.length) {
    return false
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }

  return true
}

// Custom sorting function for number columns to work with any value type and negative numbers
// Needs to be imported where the table column is defined and used with, sortType: compareNumericString
// will place any non-numeric values at the end
export const compareNumericString = (rowA: any, rowB: any, id: string, desc: boolean): number => {
  let a = Number.parseFloat(rowA.values[id])
  let b = Number.parseFloat(rowB.values[id])
  if (Number.isNaN(a)) {
    a = desc ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
  }
  if (Number.isNaN(b)) {
    b = desc ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
  }
  if (a > b) return 1
  if (a < b) return -1
  return 0
}

export const copyTextToClipboard = (elementId: string, setCopySuccess: Function): void => {
  const textElement = document.getElementById(elementId)
  if (textElement != null) {
    const text = textElement.textContent ?? textElement.innerText
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess(elementId)
        setTimeout(() => setCopySuccess(''), 2000)
      })
      .catch((err) => {
        console.error('Error copying text: ', err)
      })
  }
}

export function removeDateFields<T extends { createdAt: any, updatedAt: any }> (obj: T): Omit<T, 'createdAt' | 'updatedAt'> {
  const { createdAt, updatedAt, ...rest } = obj
  return rest
}

export const removeUnserializableFields = (user: UserProfile): void => {
  // `Date` objects are not serializable, so we convert it to string.
  (user.createdAt as any) = user.createdAt.toString();
  (user.lastSentVerificationEmailAt as any) = user.lastSentVerificationEmailAt === null ? null : user.lastSentVerificationEmailAt.toString();
  (user.updatedAt as any) = user.updatedAt.toString()
}
