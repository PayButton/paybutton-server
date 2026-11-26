import prisma from 'prisma-local/clientInstance'
import { Prisma } from '@prisma/client'
import * as addressService from 'services/addressService'
import { prismaMock } from 'prisma-local/mockedClient'
import { mockedBCHAddress, mockedNetwork, mockedAddressesOnButtons, mockedAddressIdList } from '../mockedObjects'
import { RESPONSE_MESSAGES, ADDRESS_ACTIVITY_TOUCH_THROTTLE } from 'constants/index'
import config from 'config'

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

describe('addressExists', () => {
  it('returns true when the address exists', async () => {
    prismaMock.address.findUnique.mockResolvedValue({ id: mockedBCHAddress.id } as any)
    prisma.address.findUnique = prismaMock.address.findUnique

    await expect(addressService.addressExists(mockedBCHAddress.address)).resolves.toBe(true)
  })

  it('returns false when the address is missing', async () => {
    prismaMock.address.findUnique.mockResolvedValue(null)
    prisma.address.findUnique = prismaMock.address.findUnique

    await expect(addressService.addressExists(mockedBCHAddress.address)).resolves.toBe(false)
  })

  it('throws NO_ADDRESS_FOUND when raise is true and the address is missing', async () => {
    prismaMock.address.findUnique.mockResolvedValue(null)
    prisma.address.findUnique = prismaMock.address.findUnique

    await expect(addressService.addressExists(mockedBCHAddress.address, true)).rejects.toThrow(
      RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message
    )
  })

  it('propagates database errors instead of treating them as missing addresses', async () => {
    const poolTimeout = new Error('Timed out fetching a new connection from the connection pool.')
    prismaMock.address.findUnique.mockRejectedValue(poolTimeout)
    prisma.address.findUnique = prismaMock.address.findUnique

    await expect(addressService.addressExists(mockedBCHAddress.address, true)).rejects.toThrow(poolTimeout)
    await expect(addressService.addressExists(mockedBCHAddress.address)).rejects.toThrow(poolTimeout)
  })
})

describe('address expiry', () => {
  const DAY = 24 * 60 * 60 * 1000
  let savedDays: number

  beforeEach(() => {
    savedDays = config.addressExpiryDays
    config.addressExpiryDays = 180
  })

  afterEach(() => {
    config.addressExpiryDays = savedDays
  })

  it('an address is expired only after addressExpiryDays without activity', () => {
    expect(addressService.isAddressExpired({ lastActivityAt: new Date(Date.now() - 179 * DAY) })).toBe(false)
    expect(addressService.isAddressExpired({ lastActivityAt: new Date(Date.now() - 181 * DAY) })).toBe(true)
  })

  it('0 disables expiry', async () => {
    config.addressExpiryDays = 0
    expect(addressService.getAddressExpiryCutoff()).toBeUndefined()
    expect(addressService.isAddressExpired({ lastActivityAt: new Date(0) })).toBe(false)
    expect(await addressService.fetchExpiredAddressesForNetworkId(1)).toEqual([])
    expect(await addressService.fetchExpiredUserAddresses('user-1')).toEqual([])
  })

  it('fetches active and expired addresses on either side of the cutoff', async () => {
    prismaMock.address.findMany.mockResolvedValue([])
    prisma.address.findMany = prismaMock.address.findMany

    await addressService.fetchActiveAddressesForNetworkId(1)
    await addressService.fetchExpiredAddressesForNetworkId(1)

    const [activeArgs, expiredArgs] = prismaMock.address.findMany.mock.calls.slice(-2).map(c => c[0] as any)
    expect(activeArgs.where.networkId).toBe(1)
    expect(activeArgs.where.lastActivityAt.gte).toBeInstanceOf(Date)
    expect(expiredArgs.where.lastActivityAt.lt).toEqual(activeArgs.where.lastActivityAt.gte)
  })

  it('touchAddressActivity skips addresses touched recently and dedupes ids', async () => {
    prismaMock.address.updateMany.mockResolvedValue({ count: 1 })
    prisma.address.updateMany = prismaMock.address.updateMany

    await addressService.touchAddressActivity(['a', 'b', 'a'])

    const args = prismaMock.address.updateMany.mock.calls.at(-1)?.[0] as any
    expect(args.where.id.in).toEqual(['a', 'b'])
    const throttleCutoff: Date = args.where.lastActivityAt.lt
    expect(args.data.lastActivityAt.getTime() - throttleCutoff.getTime()).toBe(ADDRESS_ACTIVITY_TOUCH_THROTTLE)
  })

  it('touchAddressActivity does nothing for an empty list', async () => {
    prismaMock.address.updateMany.mockClear()
    prisma.address.updateMany = prismaMock.address.updateMany
    await addressService.touchAddressActivity([])
    expect(prismaMock.address.updateMany).not.toHaveBeenCalled()
  })
})
