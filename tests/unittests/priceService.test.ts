import * as priceService from 'services/priceService'
import prisma from 'prisma-local/clientInstance'
import { Prisma } from '@prisma/client'
import { prismaMock } from 'prisma-local/mockedClient'
import { mockedUSDPrice, mockedCADPrice } from 'tests/mockedObjects'
import axios from 'axios'
import moment from 'moment'
import config from 'config'
import { XEC_NETWORK_ID, BCH_NETWORK_ID, USD_QUOTE_ID, PRICE_BACKFILL_PER_DAY_FETCH_LIMIT } from 'constants/index'

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

describe('fetchAndStoreMissingPrices', () => {
  const day1 = moment.utc('2026-08-02').unix()
  const day2 = moment.utc('2026-08-03').unix()
  const apiPrice = { Price_in_USD: '0.00003', Price_in_CAD: '0.00004' }
  const originalPriceAPIURL = config.priceAPIURL
  const originalToken = process.env.PRICE_API_TOKEN
  let axiosGet: jest.SpyInstance

  beforeEach(() => {
    config.priceAPIURL = 'https://price.api'
    process.env.PRICE_API_TOKEN = 'token'
    prismaMock.price.upsert.mockResolvedValue(mockedUSDPrice)
    prisma.price.upsert = prismaMock.price.upsert
    axiosGet = jest.spyOn(axios, 'get')
  })

  afterEach(() => {
    config.priceAPIURL = originalPriceAPIURL
    process.env.PRICE_API_TOKEN = originalToken
    axiosGet.mockRestore()
    prismaMock.price.upsert.mockReset()
  })

  it('fetches a few missing days one by one and stores USD + CAD', async () => {
    axiosGet.mockResolvedValue({ data: apiPrice })

    const stored = await priceService.fetchAndStoreMissingPrices(XEC_NETWORK_ID, [day1, day2])

    expect(stored).toEqual([day1, day2])
    expect(axiosGet).toHaveBeenCalledTimes(2)
    expect(axiosGet.mock.calls[0][0]).toContain('/pricebydate/token/XEC+2026-08-02')
    expect(prismaMock.price.upsert).toHaveBeenCalledTimes(4)
    expect(prismaMock.price.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ networkId: XEC_NETWORK_ID, timestamp: day1, quoteId: USD_QUOTE_ID })
    }))
  })

  it('skips days the API fails for without throwing', async () => {
    axiosGet
      .mockResolvedValueOnce({ data: apiPrice })
      .mockRejectedValueOnce(new Error('API down'))

    const stored = await priceService.fetchAndStoreMissingPrices(BCH_NETWORK_ID, [day1, day2])

    expect(stored).toEqual([day1])
  })

  it('uses a single bulk request when many days are missing', async () => {
    const days = Array.from({ length: PRICE_BACKFILL_PER_DAY_FETCH_LIMIT + 1 }, (_, i) => moment.utc('2026-08-01').add(i, 'days'))
    const bulkData: Record<string, typeof apiPrice> = {}
    for (const d of days) bulkData[d.format('YYYY-MM-DD')] = apiPrice
    axiosGet.mockResolvedValue({ data: bulkData })

    const stored = await priceService.fetchAndStoreMissingPrices(XEC_NETWORK_ID, days.map(d => d.unix()))

    expect(stored).toEqual(days.map(d => d.unix()))
    expect(axiosGet).toHaveBeenCalledTimes(1)
    expect(axiosGet.mock.calls[0][0]).toContain('/dailyprices/token/XEC')
  })

  it('returns nothing for an unknown network', async () => {
    expect(await priceService.fetchAndStoreMissingPrices(999, [day1])).toEqual([])
    expect(axiosGet).not.toHaveBeenCalled()
  })
})
