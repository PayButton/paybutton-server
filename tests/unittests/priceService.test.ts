import * as priceService from 'services/priceService'
import prisma from 'prisma/clientInstance'
import { Prisma } from '@prisma/client'
import { prismaMock } from 'prisma/mockedClient'
import { mockedUSDPrice, mockedCADPrice } from 'tests/mockedObjects'

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
