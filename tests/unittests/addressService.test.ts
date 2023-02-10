import prisma from 'prisma/clientInstance'
import { Prisma } from '@prisma/client'
import * as addressService from 'services/addressService'
import { prismaMock } from 'prisma/mockedClient'
import { mockedBCHAddress, mockedNetwork, mockedTransactionList } from '../mockedObjects'
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
    prismaMock.transaction.findMany.mockResolvedValue(mockedTransactionList)
    prisma.transaction.findMany = prismaMock.transaction.findMany
    jest.spyOn(addressService, 'fetchAddressBySubstring').mockImplementation(async (_: string) => {
      return {
        network: mockedNetwork,
        transactions: mockedTransactionList,
        ...mockedBCHAddress
      }
    })
    const result = await addressService.getAddressPaymentInfo('mock')
    expect(result).toHaveProperty('balance', new Prisma.Decimal('6.01247724'))
    expect(result).toHaveProperty('paymentCount', 3)
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
