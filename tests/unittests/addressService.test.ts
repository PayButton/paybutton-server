import prisma from 'prisma-local/clientInstance'
import { Prisma } from '@prisma/client'
import * as addressService from 'services/addressService'
import { prismaMock } from 'prisma-local/mockedClient'
import { mockedBCHAddress, mockedNetwork, mockedAddressesOnButtons, mockedAddressIdList } from '../mockedObjects'
import { RESPONSE_MESSAGES } from 'constants/index'

describe('Find by substring', () => {
  it('Return single address', async () => {
    prismaMock.address.findMany.mockResolvedValue([mockedBCHAddress])
    prisma.address.findMany = prismaMock.address.findMany

    const result = await addressService.fetchAddressBySubstring('mock')
    expect(result).toEqual(mockedBCHAddress)
  })
  it('Throw no addresses found error', async () => {
    prismaMock.address.findMany.mockResolvedValue([])
    prisma.address.findMany = prismaMock.address.findMany

    await expect(addressService.fetchAddressBySubstring('mock')).rejects.toThrow(
      RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message
    )
  })
  it('Get address payment info', async () => {
    prismaMock.address.findMany.mockResolvedValue([mockedBCHAddress])
    prisma.address.findMany = prismaMock.address.findMany
    prismaMock.transaction.aggregate.mockResolvedValue({
      _sum: { amount: new Prisma.Decimal('6.01247724') },
      _count: { _all: 3 },
      _avg: { amount: null },
      _min: { amount: null },
      _max: { amount: null }
    } as any)
    prisma.transaction.aggregate = prismaMock.transaction.aggregate as any
    prismaMock.transaction.count.mockResolvedValue(3)
    prisma.transaction.count = prismaMock.transaction.count
    const result = await addressService.generateAddressPaymentInfo('mock')
    expect(result).toHaveProperty('balance', new Prisma.Decimal('6.01247724'))
    expect(result).toHaveProperty('paymentCount', 3)
  })
  it('Get addresses by paybuttonId', async () => {
    prismaMock.addressesOnButtons.findMany.mockResolvedValue(mockedAddressesOnButtons)
    prisma.addressesOnButtons.findMany = prismaMock.addressesOnButtons.findMany
    jest.spyOn(addressService, 'fetchAddressesByPaybuttonId').mockImplementation(async (_: string) => {
      return mockedAddressIdList
    })
    const result = await addressService.fetchAddressesByPaybuttonId('mock')
    expect(result).toHaveLength(mockedAddressIdList.length)
    expect(result[0]).toEqual(mockedAddressIdList[0])
  })
})

describe('Create by substring', () => {
  it('Create single address', async () => {
    prismaMock.address.upsert.mockResolvedValue(mockedBCHAddress)
    prisma.address.upsert = prismaMock.address.upsert
    prismaMock.network.findUnique.mockResolvedValue(mockedNetwork)
    prisma.network.findUnique = prismaMock.network.findUnique

    const result = await addressService.upsertAddress(mockedBCHAddress.address)
    expect(result).toEqual(mockedBCHAddress)
  })
})
