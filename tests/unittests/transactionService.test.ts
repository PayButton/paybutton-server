import prisma from 'prisma-local/clientInstance'
import * as transactionService from 'services/transactionService'
import { prismaMock } from 'prisma-local/mockedClient'
import { mockedBCHAddress, mockedUSDPriceOnTransaction, mockedCADPriceOnTransaction, mockedTransaction, mockedUserProfile, mockedAddressIdList, mockedTransactionList } from '../mockedObjects'
import { CacheSet } from 'redis/index'
import { Prisma } from '@prisma/client'
import * as addressService from 'services/addressService'
import { RESPONSE_MESSAGES } from 'constants/index'
import moment from 'moment-timezone'

const includePrices = {
  prices: {
    include: {
      price: true
    }
  }
}

const includePaybuttonsAndPrices = {
  address: {
    include: {
      paybuttons: {
        include: {
          paybutton: true
        }
      }
    }
  },
  ...includePrices,
  inputs: { orderBy: { index: 'asc' as const } }
}

describe('Create services', () => {
  it('Return created transaction', async () => {
    prismaMock.transaction.upsert.mockResolvedValue(mockedTransaction)
    prisma.transaction.upsert = prismaMock.transaction.upsert

    prismaMock.transaction.findUniqueOrThrow.mockResolvedValue(mockedTransaction)
    prisma.transaction.findUniqueOrThrow = prismaMock.transaction.findUniqueOrThrow

    prismaMock.transaction.findUnique.mockResolvedValue(mockedTransaction)
    prisma.transaction.findUnique = prismaMock.transaction.findUnique

    prismaMock.address.findMany.mockResolvedValue([mockedBCHAddress])
    prisma.address.findMany = prismaMock.address.findMany

    prismaMock.address.findUnique.mockResolvedValue(mockedBCHAddress)
    prisma.address.findUnique = prismaMock.address.findUnique

    prismaMock.userProfile.findMany.mockResolvedValue([mockedUserProfile])
    prisma.userProfile.findMany = prismaMock.userProfile.findMany

    prismaMock.price.findUniqueOrThrow.mockResolvedValue(mockedUSDPriceOnTransaction.price)
    prisma.price.findUniqueOrThrow = prismaMock.price.findUniqueOrThrow

    prismaMock.pricesOnTransactions.upsert.mockResolvedValue(mockedUSDPriceOnTransaction)
    prisma.pricesOnTransactions.upsert = prismaMock.pricesOnTransactions.upsert

    prismaMock.pricesOnTransactions.deleteMany.mockResolvedValue({ count: 2 })
    prisma.pricesOnTransactions.deleteMany = prismaMock.pricesOnTransactions.deleteMany

    prismaMock.pricesOnTransactions.createMany.mockResolvedValue({ count: 2 })
    prisma.pricesOnTransactions.createMany = prismaMock.pricesOnTransactions.createMany

    const mockCacheTx = jest.spyOn(CacheSet, 'txCreation')
    mockCacheTx.mockImplementation(async () => {
      // Do nothing
    })

    const mockCacheTxs = jest.spyOn(CacheSet, 'txsCreation')
    mockCacheTxs.mockImplementation(async () => {
      // Do nothing
    })

    const { prices, ...argsTransaction } = {
      ...mockedTransaction,
      addressId: mockedBCHAddress.id
    }
    const result = await transactionService.upsertTransaction(
      argsTransaction
    )
    expect(result).toEqual({
      created: true,
      tx: mockedTransaction
    })
  })

  it('Convert hash from base64 to hex', async () => {
    const result = transactionService.base64HashToHex(
      '4xiLDnvh5p1cIPpTW7wa2Xgs53iIIyNgrp2v3hClie0='
    )
    expect(result).toEqual('ed89a510deaf9dae6023238878e72c78d91abc5b53fa205c9de6e17b0e8b18e3')
  })
})

describe('Amount transactioned', () => {
  it('Negative transaction', () => {
    const amount = transactionService.getTransactionValue(
      {
        ...mockedTransaction,
        prices: [
          {
            ...mockedUSDPriceOnTransaction,
            price: {
              ...mockedUSDPriceOnTransaction.price,
              value: new Prisma.Decimal('-2')
            }
          },
          {
            ...mockedCADPriceOnTransaction,
            price: {
              ...mockedCADPriceOnTransaction.price,
              value: new Prisma.Decimal('-3')
            }
          }
        ]
      }
    )
    expect(amount.usd.toString()).toBe('-8.62495448')
    expect(amount.cad.toString()).toBe('-12.93743172')
  })
  it('Positive transaction', () => {
    const amount = transactionService.getTransactionValue(mockedTransaction)
    expect(amount.usd.toString()).toBe('0.0000758564746516')
    expect(amount.cad.toString()).toBe('0.000075899599424')
  })
})

describe('Fetch transactions by paybuttonId', () => {
  it('fetch transactions by paybuttonId', async () => {
    prismaMock.transaction.findMany.mockResolvedValue(mockedTransactionList)
    prisma.transaction.findMany = prismaMock.transaction.findMany
    prisma.addressesOnButtons.findMany = prismaMock.addressesOnButtons.findMany

    jest.spyOn(addressService, 'fetchAddressesByPaybuttonId').mockImplementation(async (_: string) => {
      return mockedAddressIdList
    })

    const query = {
      where: {
        addressId: {
          in: mockedAddressIdList
        },
        address: {
          networkId: {
            in: [1, 2]
          }
        }
      },
      orderBy: {
        timestamp: 'asc'
      },
      include: includePaybuttonsAndPrices
    }

    const result = await transactionService.fetchTransactionsByPaybuttonId('mock')

    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(query)
    expect(result).toHaveLength(mockedTransactionList.length)
    expect(result[0]).toEqual(mockedTransactionList[0])
  })

  it('handle no transaction found for paybuttonId', async () => {
    prismaMock.transaction.findMany.mockResolvedValue([])
    prisma.transaction.findMany = prismaMock.transaction.findMany

    try {
      await transactionService.fetchTransactionsByPaybuttonId('mock')
    } catch (error: any) {
      expect(error.message).toEqual(RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404.message)
    }
  })
})

describe('Address object arrays (input/output) integration', () => {
  it('getSimplifiedTrasaction returns provided input/output address objects untouched', () => {
    const tx: any = {
      hash: 'hash1',
      amount: new Prisma.Decimal(5),
      confirmed: true,
      opReturn: '',
      address: { address: 'ecash:qqprimaryaddressxxxxxxxxxxxxxxxxxxxxx' },
      timestamp: 1700000000,
      prices: mockedTransaction.prices
    }
    const inputs = [
      { address: 'ecash:qqinput1', amount: new Prisma.Decimal(1.23) },
      { address: 'ecash:qqinput2', amount: new Prisma.Decimal(4.56) }
    ]
    const outputs = [
      { address: 'ecash:qqout1', amount: new Prisma.Decimal(7.89) },
      { address: 'ecash:qqout2', amount: new Prisma.Decimal(0.12) }
    ]
    const simplified = transactionService.getSimplifiedTrasaction(tx, inputs, outputs)
    expect(simplified.inputAddresses).toEqual(inputs)
    expect(simplified.outputAddresses).toEqual(outputs)
  })

  it('getSimplifiedTrasaction uses inputs from tx when not provided explicitly, but outputs must be provided as parameter', () => {
    const inputsFromDb = [
      { address: 'ecash:qqinput1', amount: new Prisma.Decimal(1.23) },
      { address: 'ecash:qqinput2', amount: new Prisma.Decimal(4.56) }
    ]
    const outputsProvided = [
      { address: 'ecash:qqout1', amount: new Prisma.Decimal(7.89) },
      { address: 'ecash:qqout2', amount: new Prisma.Decimal(0.12) }
    ]
    const tx: any = {
      hash: 'hash1',
      amount: new Prisma.Decimal(5),
      confirmed: true,
      opReturn: '',
      address: { address: 'ecash:qqprimaryaddressxxxxxxxxxxxxxxxxxxxxx' },
      timestamp: 1700000000,
      prices: mockedTransaction.prices,
      inputs: inputsFromDb
      // Note: outputs are no longer stored in DB, so they won't be read from tx.outputs
    }
    const simplified = transactionService.getSimplifiedTrasaction(tx, undefined, outputsProvided)
    expect(simplified.inputAddresses).toEqual([
      { address: 'ecash:qqinput1', amount: new Prisma.Decimal(1.23) },
      { address: 'ecash:qqinput2', amount: new Prisma.Decimal(4.56) }
    ])
    expect(simplified.outputAddresses).toEqual([
      { address: 'ecash:qqout1', amount: new Prisma.Decimal(7.89) },
      { address: 'ecash:qqout2', amount: new Prisma.Decimal(0.12) }
    ])
  })
})

describe('Date and timezone filters for transactions', () => {
  const startDate = '2025-11-05'
  const endDate = '2025-11-10'

  const timezones = [
    { label: 'UTC', timezone: 'UTC' },
    { label: 'positive offset (China)', timezone: 'Asia/Shanghai' },
    { label: 'negative offset (Canada)', timezone: 'America/Toronto' }
  ]

  const computeExpectedRange = (tz: string): { gte: number, lte: number } => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    const startMoment = moment.tz(
      {
        year: start.getUTCFullYear(),
        month: start.getUTCMonth(),
        day: start.getUTCDate()
      },
      tz
    ).startOf('day')

    const endMoment = moment.tz(
      {
        year: end.getUTCFullYear(),
        month: end.getUTCMonth(),
        day: end.getUTCDate()
      },
      tz
    ).endOf('day')

    return {
      gte: Math.round(startMoment.unix()),
      lte: Math.round(endMoment.unix())
    }
  }

  const computeYearFilter = (year: number, tz: string): { timestamp: { gte: number, lte: number } } => {
    const startDateObj = new Date(year, 0, 1, 0, 0, 0)
    const endDateObj = new Date(year, 11, 31, 23, 59, 59)

    const startMoment = moment.tz(
      {
        year: startDateObj.getUTCFullYear(),
        month: startDateObj.getUTCMonth(),
        day: startDateObj.getUTCDate()
      },
      tz
    ).startOf('day')

    const endMoment = moment.tz(
      {
        year: endDateObj.getUTCFullYear(),
        month: endDateObj.getUTCMonth(),
        day: endDateObj.getUTCDate()
      },
      tz
    ).endOf('day')

    return {
      timestamp: {
        gte: Math.round(startMoment.unix()),
        lte: Math.round(endMoment.unix())
      }
    }
  }

  test.each(timezones)(
    'fetchAllPaymentsByUserIdWithPagination uses local day boundaries for %s',
    async ({ timezone }) => {
      prismaMock.transaction.findMany.mockResolvedValue([])
      prisma.transaction.findMany = prismaMock.transaction.findMany

      const expected = computeExpectedRange(timezone)

      await transactionService.fetchAllPaymentsByUserIdWithPagination(
        'user-1',
        0,
        10,
        timezone,
        'timestamp',
        true,
        undefined,
        undefined,
        startDate,
        endDate
      )

      expect(prismaMock.transaction.findMany).toHaveBeenCalledTimes(1)
      const callArgs = prismaMock.transaction.findMany.mock.calls[0][0] as any

      expect(callArgs.where.timestamp).toEqual(expected)
      expect(callArgs.where.OR).toBeUndefined()
    }
  )

  test.each(timezones)(
    'getFilteredTransactionCount uses local day boundaries for %s',
    async ({ timezone }) => {
      prismaMock.transaction.count.mockResolvedValue(7)
      prisma.transaction.count = prismaMock.transaction.count

      const expected = computeExpectedRange(timezone)

      const result = await transactionService.getFilteredTransactionCount(
        'user-1',
        undefined,
        undefined,
        timezone,
        startDate,
        endDate
      )

      expect(result).toBe(7)
      expect(prismaMock.transaction.count).toHaveBeenCalledTimes(1)
      const callArgs = prismaMock.transaction.count.mock.calls[0][0] as any

      expect(callArgs.where.timestamp).toEqual(expected)
      expect(callArgs.where.OR).toBeUndefined()
    }
  )

  it('uses year filters when only years are provided (no start/end)', async () => {
    const timezone = 'America/Sao_Paulo'
    const years = ['2025']

    prismaMock.transaction.findMany.mockResolvedValue([])
    prisma.transaction.findMany = prismaMock.transaction.findMany

    await transactionService.fetchAllPaymentsByUserId(
      'user-1',
      undefined,
      undefined,
      years,
      undefined,
      undefined,
      timezone
    )

    expect(prismaMock.transaction.findMany).toHaveBeenCalledTimes(1)
    const callArgs = prismaMock.transaction.findMany.mock.calls[0][0] as any

    const expectedFilter = computeYearFilter(2025, timezone)
    expect(callArgs.where.timestamp).toBeUndefined()
    expect(callArgs.where.OR).toHaveLength(1)
    expect(callArgs.where.OR[0]).toEqual(expectedFilter)
  })

  it('date range takes precedence over year filters (pagination)', async () => {
    const timezone = 'America/Sao_Paulo'
    const years = ['2024']

    prismaMock.transaction.findMany.mockResolvedValue([])
    prisma.transaction.findMany = prismaMock.transaction.findMany

    const expected = computeExpectedRange(timezone)

    await transactionService.fetchAllPaymentsByUserIdWithPagination(
      'user-1',
      0,
      10,
      timezone,
      'timestamp',
      true,
      undefined,
      years,
      startDate,
      endDate
    )

    const callArgs = prismaMock.transaction.findMany.mock.calls[0][0] as any

    expect(callArgs.where.timestamp).toEqual(expected)
    expect(callArgs.where.OR).toBeUndefined()
  })

  it('date range takes precedence over year filters (count)', async () => {
    const timezone = 'America/Sao_Paulo'
    const years = ['2024']

    prismaMock.transaction.count.mockResolvedValue(13)
    prisma.transaction.count = prismaMock.transaction.count

    const expected = computeExpectedRange(timezone)

    const result = await transactionService.getFilteredTransactionCount(
      'user-1',
      undefined,
      years,
      timezone,
      startDate,
      endDate
    )

    expect(result).toBe(13)
    expect(prismaMock.transaction.count).toHaveBeenCalledTimes(1)
    const callArgs = prismaMock.transaction.count.mock.calls[0][0] as any

    expect(callArgs.where.timestamp).toEqual(expected)
    expect(callArgs.where.OR).toBeUndefined()
  })

  it('does not add timestamp or OR when no years and no date range are provided', async () => {
    const timezone = 'America/Sao_Paulo'

    prismaMock.transaction.findMany.mockResolvedValue([])
    prisma.transaction.findMany = prismaMock.transaction.findMany

    await transactionService.fetchAllPaymentsByUserIdWithPagination(
      'user-1',
      0,
      10,
      timezone,
      'timestamp',
      true,
      undefined,
      undefined,
      undefined,
      undefined
    )

    const callArgs = prismaMock.transaction.findMany.mock.calls[0][0] as any

    expect(callArgs.where.timestamp).toBeUndefined()
    expect(callArgs.where.OR).toBeUndefined()
  })
})
