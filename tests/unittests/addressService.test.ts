import prisma from 'prisma/clientInstance'
import * as addressService from 'services/addressService'
import { prismaMock } from 'prisma/mockedClient'
import { mockedBCHAddress } from '../mockedObjects'
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
})
