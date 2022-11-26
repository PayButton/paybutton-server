import * as priceService from 'services/priceService'
import prisma from 'prisma/clientInstance'
import { Prisma } from '@prisma/client'
import { RESPONSE_MESSAGES } from 'constants/index'
import { appInfo } from 'config/appInfo'
import { prismaMock } from 'prisma/mockedClient'
import { mockedUSDPrice, mockedCADPrice } from 'tests/mockedObjects'

import axios from 'axios'
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('Sync price from transaction', () => {
  beforeEach(async () => {
    prismaMock.price.findMany.mockResolvedValue([])
    prisma.price.findMany = prismaMock.price.findMany
  })
  it('Ignore price API fail response', async () => {
    mockedAxios.get.mockResolvedValue({ data: { success: false } })
    const res = await priceService.syncTransactionPriceValues({
      networkId: 1,
      transactionId: 1,
      timestamp: 1
    })
    expect(res).toBeUndefined()
  })
  it('Fail if no PRICE_API_URL', async () => {
    appInfo.priceAPIURL = ''
    expect.assertions(1)
    try {
      await priceService.syncTransactionPriceValues({
        networkId: 1,
        transactionId: 1,
        timestamp: 1
      })
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.MISSING_PRICE_API_URL_400.message)
    }
    appInfo.priceAPIURL = 'foo'
  })
  it('Undefined if price already exists', async () => {
    mockedAxios.get.mockResolvedValue({ data: { success: false } })
    prismaMock.price.findMany.mockResolvedValue([mockedUSDPrice, mockedCADPrice])
    prisma.price.findMany = prismaMock.price.findMany
    const res = await priceService.syncTransactionPriceValues({
      networkId: 1,
      transactionId: 1,
      timestamp: 1
    })
    expect(res).toBeUndefined()
  })
})

describe('Fetch services', () => {
  it('Get current prices for networkId', async () => {
    prismaMock.price.findMany.mockResolvedValue([mockedUSDPrice, mockedCADPrice])
    prisma.price.findMany = prismaMock.price.findMany
    const res = await priceService.getCurrentPricesForNetworkId(1)
    expect(res).toStrictEqual({
      cad: new Prisma.Decimal('18'),
      usd: new Prisma.Decimal('10')
    })
  })
})
