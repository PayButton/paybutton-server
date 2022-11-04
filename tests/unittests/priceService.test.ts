import * as priceService from 'services/priceService'
import { RESPONSE_MESSAGES } from 'constants/index'
import { appInfo } from 'config/appInfo'

import axios from 'axios'
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('', () => {
  it('Ignore price API fail response', async () => {
    mockedAxios.get.mockResolvedValue({ data: { success: false } })
    await priceService.syncTransactionPrices({
      networkId: 1,
      transactionId: 1,
      timestamp: 1
    })
  })
  it('Ignore price API fail response', async () => {
    appInfo.priceAPIURL = ''
    expect.assertions(1)
    try {
      await priceService.syncTransactionPrices({
        networkId: 1,
        transactionId: 1,
        timestamp: 1
      })
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.MISSING_PRICE_API_URL_400.message)
    }
  })
})
