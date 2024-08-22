import { SideshiftQuoteRes, CreateQuoteAndShiftData, GetPairRateData, SideShiftCoinRes, SideshiftPairRes, SideshiftShiftRes, SideshiftError } from './types'
import config from 'config/index'

export const SIDESHIFT_BASE_URL = 'https://sideshift.ai/api/v2/'

export const getSideshiftPairRate = async (getPairRateData: GetPairRateData): Promise<SideshiftPairRes> => {
  const res = await fetch(SIDESHIFT_BASE_URL + `pair/${getPairRateData.from}/${getPairRateData.to}`)
  const data = await res.json()
  return data as SideshiftPairRes
}

export const postSideshiftQuote = async (createQuoteData: CreateQuoteAndShiftData): Promise<SideshiftQuoteRes | SideshiftError> => {
  const requestBody = JSON.stringify({
    ...createQuoteData,
    affiliateId: config.sideshiftAffiliateId
  })

  const res = await fetch(SIDESHIFT_BASE_URL + 'quotes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sideshift-secret': process.env.SIDESHIFT_SECRET_KEY as string
    },
    body: requestBody
  })
  const data = await res.json()
  if ('error' in data) {
    console.error('Error when creating sideshift quote.', {
      createQuoteData,
      responseData: data
    })
    return {
      errorType: 'quote-error',
      errorMessage: data.error.message
    }
  }
  const quoteResponse = data as SideshiftQuoteRes
  console.log('Successfully created quote.', { quoteResponse })
  return quoteResponse
}

interface CreateShiftData {
  quoteId: string
  settleAddress: string
}

export const postSideshiftShift = async (createShiftData: CreateShiftData): Promise<SideshiftShiftRes | SideshiftError> => {
  const { quoteId, settleAddress } = createShiftData
  const requestBody = JSON.stringify({
    affiliateId: config.sideshiftAffiliateId,
    settleAddress,
    quoteId
  })

  const res = await fetch(SIDESHIFT_BASE_URL + 'shifts/fixed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sideshift-secret': process.env.SIDESHIFT_SECRET_KEY as string
    },
    body: requestBody
  })
  const data = await res.json()
  if ('error' in data) {
    console.error('Error when creating sideshift shift.', {
      createShiftData,
      responseData: data
    })
    return {
      errorType: 'shift-error',
      errorMessage: data.error.message
    }
  }
  const shiftResponse = data as SideshiftShiftRes
  console.log('Successfully created shift.', { shiftResponse })
  return shiftResponse
}

export const getSideshiftCoinsInfo = async (): Promise<SideShiftCoinRes[]> => {
  const res = await fetch(SIDESHIFT_BASE_URL + 'coins')
  const data = await res.json()

  const coins = data as SideShiftCoinRes[]
  coins.sort((a, b) => a.name < b.name ? -1 : 1)
  return coins
}
