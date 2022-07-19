import prisma from 'prisma/clientInstance'
import * as addressesService from 'services/addressesService'
import { prismaMock } from 'prisma/mockedClient'
import { mockedPaybuttonAddress } from '../mockedObjects'
import { RESPONSE_MESSAGES } from 'constants/index'

describe('Find by substring', () => {
  it('Return single address', async () => {
    prismaMock.address.findMany.mockResolvedValue([mockedPaybuttonAddress])
    prisma.address.findMany = prismaMock.address.findMany

    const result = await addressesService.fetchPaybuttonAddressBySubstring('mock')
    expect(result).toEqual(mockedPaybuttonAddress)
  })
  it('Throw no addresses found error', async () => {
    prismaMock.address.findMany.mockResolvedValue([])
    prisma.address.findMany = prismaMock.address.findMany

    await expect(addressesService.fetchPaybuttonAddressBySubstring('mock')).rejects.toThrow(
      RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message
    )
  })
})
