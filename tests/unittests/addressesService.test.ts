import prisma from 'prisma/clientInstance'
import * as addressesService from 'services/addressesService'
import { prismaMock } from 'prisma/mockedClient'
import { mockedAddress } from '../mockedObjects'
import { RESPONSE_MESSAGES } from 'constants/index'

describe('Find by substring', () => {
  it('Return single address', async () => {
    prismaMock.address.findMany.mockResolvedValue([mockedAddress])
    prisma.address.findMany = prismaMock.address.findMany

    const result = await addressesService.fetchAddressBySubstring('mock')
    expect(result).toEqual(mockedAddress)
  })
  it('Throw no addresses found error', async () => {
    prismaMock.address.findMany.mockResolvedValue([])
    prisma.address.findMany = prismaMock.address.findMany

    await expect(addressesService.fetchAddressBySubstring('mock')).rejects.toThrow(
      RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message
    )
  })
})
