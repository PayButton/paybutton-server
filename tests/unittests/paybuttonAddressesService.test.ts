import prisma from 'prisma/clientInstance'
import * as paybuttonAddressesService from 'services/paybuttonAddressesService'
import { prismaMock } from 'prisma/mockedClient'
import { mockedPaybuttonAddress } from '../mockedObjects'
import { RESPONSE_MESSAGES } from 'constants/index'

describe('Find by substring', () => {
  it('Return single address', async () => {
    prismaMock.paybuttonAddress.findMany.mockResolvedValue([mockedPaybuttonAddress])
    prisma.paybuttonAddress.findMany = prismaMock.paybuttonAddress.findMany

    const result = await paybuttonAddressesService.fetchPaybuttonAddressBySubstring('mock')
    expect(result).toEqual(mockedPaybuttonAddress)
  })
  it('Throw no addresses found error', async () => {
    prismaMock.paybuttonAddress.findMany.mockResolvedValue([])
    prisma.paybuttonAddress.findMany = prismaMock.paybuttonAddress.findMany

    await expect(paybuttonAddressesService.fetchPaybuttonAddressBySubstring('mock')).rejects.toThrow(
      RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message
    )
  })
})
