import * as priceService from 'services/priceService'
import { RESPONSE_MESSAGES } from 'constants/index'
import { mockedTransaction } from '../mockedObjects'
import { appInfo } from 'config/appInfo'

import axios from 'axios'
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('', () => {
  it('Ignore price API fail response', async () => {
    mockedAxios.get.mockResolvedValue({ data: { success: false } })
    await priceService.syncPriceForTransaction(mockedTransaction)
  })
  it('Ignore price API fail response', async () => {
    appInfo.priceAPIURL = undefined
    expect.assertions(1)
    try {
      await priceService.syncPriceForTransaction(mockedTransaction)
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.MISSING_PRICE_API_URL_400.message)
    }
  })
})
