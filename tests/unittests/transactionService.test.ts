import prisma from 'prisma-local/clientInstance'
import * as transactionService from 'services/transactionService'
import { prismaMock } from 'prisma-local/mockedClient'
import { mockedBCHAddress, mockedUSDPriceOnTransaction, mockedCADPriceOnTransaction, mockedTransaction, mockedUserProfile, mockedAddressIdList, mockedTransactionList } from '../mockedObjects'
import { exampleAddresses } from '../utils'
import { CacheSet } from 'redis/index'
import { Prisma } from '@prisma/client'
import * as addressService from 'services/addressService'
import { RESPONSE_MESSAGES } from 'constants/index'
import moment from 'moment-timezone'
import * as priceService from 'services/priceService'
import { redis } from 'redis/clientInstance'

const PRICE_RELINK_PENDING_KEY = 'prices:relinkPending'
const clearPendingRelinks = async (): Promise<void> => {
  const pending = await redis.smembers(PRICE_RELINK_PENDING_KEY)
  if (pending.length > 0) await redis.srem(PRICE_RELINK_PENDING_KEY, ...pending)
}

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

  beforeEach(() => {
    prismaMock.address.findMany.mockResolvedValue([{ id: 'addr-1' }] as any)
    prisma.address.findMany = prismaMock.address.findMany
  })

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

  it('maps payment sort fields and ignores values that are not on the blacklist', async () => {
    prismaMock.transaction.findMany.mockResolvedValue([])
    prisma.transaction.findMany = prismaMock.transaction.findMany

    await transactionService.fetchAllPaymentsByUserIdWithPagination(
      'user-1', 0, 10, 'UTC', 'values', false
    )
    expect(prismaMock.transaction.findMany.mock.calls[0][0]).toEqual(expect.objectContaining({
      orderBy: { amount: 'asc' }
    }))

    prismaMock.transaction.findMany.mockClear()
    await transactionService.fetchAllPaymentsByUserIdWithPagination(
      'user-1', 0, 10, 'UTC', 'networkId', true
    )
    expect(prismaMock.transaction.findMany.mock.calls[0][0]).toEqual(expect.objectContaining({
      orderBy: { address: { networkId: 'desc' } }
    }))

    prismaMock.transaction.findMany.mockClear()
    await transactionService.fetchAllPaymentsByUserIdWithPagination(
      'user-1', 0, 10, 'UTC', '__proto__', true
    )
    expect(prismaMock.transaction.findMany.mock.calls[0][0]).toEqual(expect.objectContaining({
      orderBy: { timestamp: 'desc' }
    }))

    prismaMock.transaction.findMany.mockClear()
    await transactionService.fetchAllPaymentsByUserIdWithPagination(
      'user-1', 0, 10, 'UTC', ['amount', 'hash'] as unknown as string, true
    )
    expect(prismaMock.transaction.findMany.mock.calls[0][0]).toEqual(expect.objectContaining({
      orderBy: { timestamp: 'desc' }
    }))
  })
})

describe('address transaction orderBy blacklist', () => {
  const address = `ecash:${exampleAddresses.ecash}`

  beforeEach(() => {
    prismaMock.address.findUnique.mockResolvedValue({ id: mockedBCHAddress.id } as any)
    prisma.address.findUnique = prismaMock.address.findUnique
    prismaMock.transaction.findMany.mockResolvedValue([])
    prisma.transaction.findMany = prismaMock.transaction.findMany
  })

  it('queries by addressId after resolving the address', async () => {
    await transactionService.fetchPaginatedAddressTransactions(address, 0, 10, 'timestamp', true)
    expect(prismaMock.transaction.findMany.mock.calls[0][0]).toEqual(expect.objectContaining({
      where: { addressId: mockedBCHAddress.id },
      orderBy: { timestamp: 'desc' }
    }))
  })

  it('sorts by an allowed nested address field', async () => {
    await transactionService.fetchPaginatedAddressTransactions(address, 0, 10, 'address.networkId', false)
    expect(prismaMock.transaction.findMany.mock.calls[0][0]).toEqual(expect.objectContaining({
      where: { addressId: mockedBCHAddress.id },
      orderBy: { address: { networkId: 'asc' } }
    }))
  })

  it('falls back to timestamp when orderBy is an array or an unknown field', async () => {
    await transactionService.fetchPaginatedAddressTransactions(address, 0, 10, ['timestamp'] as unknown as string, true)
    expect(prismaMock.transaction.findMany.mock.calls[0][0]).toEqual(expect.objectContaining({
      orderBy: { timestamp: 'desc' }
    }))

    prismaMock.transaction.findMany.mockClear()
    await transactionService.fetchPaginatedAddressTransactions(address, 0, 10, 'constructor', true)
    expect(prismaMock.transaction.findMany.mock.calls[0][0]).toEqual(expect.objectContaining({
      orderBy: { timestamp: 'desc' }
    }))
  })
})

describe('connectTransactionsListToPrices', () => {
  const dayTs = moment.utc('2026-08-02').unix()
  const tx = { ...mockedTransaction, id: 'tx-1', timestamp: dayTs + 3600, address: { networkId: 1 } }
  const usd = { ...mockedUSDPriceOnTransaction.price, id: 11, timestamp: dayTs, networkId: 1 }
  const cad = { ...mockedCADPriceOnTransaction.price, id: 12, timestamp: dayTs, networkId: 1 }
  let fetchMissing: jest.SpyInstance

  beforeEach(() => {
    prismaMock.pricesOnTransactions.deleteMany.mockResolvedValue({ count: 0 })
    prismaMock.pricesOnTransactions.createMany.mockResolvedValue({ count: 2 })
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock))
    prisma.$transaction = prismaMock.$transaction
    prisma.price.findMany = prismaMock.price.findMany
    fetchMissing = jest.spyOn(priceService, 'fetchAndStoreMissingPrices')
  })

  afterEach(() => {
    fetchMissing.mockRestore()
    prismaMock.price.findMany.mockReset()
    prismaMock.pricesOnTransactions.createMany.mockClear()
  })

  it('fetches prices missing from the DB and links the tx to them', async () => {
    prismaMock.price.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([usd, cad])
    fetchMissing.mockResolvedValue([dayTs])

    await transactionService.connectTransactionsListToPrices([tx] as any)

    expect(fetchMissing).toHaveBeenCalledWith(1, [dayTs])
    expect(prismaMock.pricesOnTransactions.createMany).toHaveBeenCalledWith({
      data: [{ transactionId: 'tx-1', priceId: 11 }, { transactionId: 'tx-1', priceId: 12 }],
      skipDuplicates: true
    })
  })

  it('does not call the price API when prices are already stored', async () => {
    prismaMock.price.findMany.mockResolvedValueOnce([usd, cad])

    await transactionService.connectTransactionsListToPrices([tx] as any)

    expect(fetchMissing).not.toHaveBeenCalled()
    expect(prismaMock.pricesOnTransactions.createMany).toHaveBeenCalledTimes(1)
  })

  it('skips the tx when the price API cannot provide the day', async () => {
    prismaMock.price.findMany.mockResolvedValueOnce([])
    fetchMissing.mockResolvedValue([])

    await transactionService.connectTransactionsListToPrices([tx] as any)

    expect(prismaMock.pricesOnTransactions.createMany).not.toHaveBeenCalled()
  })
})

describe('connectTransactionsListToPrices chunking', () => {
  const dayTs = moment.utc('2026-08-02').unix()
  const usd = { ...mockedUSDPriceOnTransaction.price, id: 11, timestamp: dayTs, networkId: 1 }
  const cad = { ...mockedCADPriceOnTransaction.price, id: 12, timestamp: dayTs, networkId: 1 }
  const makeTxs = (n: number): any[] => Array.from({ length: n }, (_, i) => ({
    id: `tx-${i}`, timestamp: dayTs + 60, address: { networkId: 1 }
  }))

  beforeEach(() => {
    prisma.$transaction = prismaMock.$transaction
    prisma.price.findMany = prismaMock.price.findMany
    prisma.pricesOnTransactions.deleteMany = prismaMock.pricesOnTransactions.deleteMany
    prisma.pricesOnTransactions.createMany = prismaMock.pricesOnTransactions.createMany
    prisma.pricesOnTransactions.groupBy = prismaMock.pricesOnTransactions.groupBy
    prisma.transaction.findMany = prismaMock.transaction.findMany
    prismaMock.price.findMany.mockResolvedValue([usd, cad])
    prismaMock.pricesOnTransactions.deleteMany.mockResolvedValue({ count: 0 })
    prismaMock.pricesOnTransactions.createMany.mockResolvedValue({ count: 0 })
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock))
  })

  it('writes each chunk of txs in its own DB transaction', async () => {
    const linked = await transactionService.connectTransactionsListToPrices(makeTxs(501))

    expect(linked).toHaveLength(501)
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2)
    const createManyCalls = prismaMock.pricesOnTransactions.createMany.mock.calls as any[]
    expect(createManyCalls[0][0].data).toHaveLength(1000)
    expect(createManyCalls[1][0].data).toHaveLength(2)
  })

  it('keeps linking the remaining chunks when one chunk fails', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    prismaMock.$transaction
      .mockRejectedValueOnce(new Error('Transaction already closed'))
      .mockImplementation(async (fn: any) => fn(prismaMock))

    const linked = await transactionService.connectTransactionsListToPrices(makeTxs(501))

    expect(linked).toEqual(['tx-500'])
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2)
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Transaction already closed'))
    errorSpy.mockRestore()
  })

  it('only unlinks existing prices when skipUnlink is not set', async () => {
    await transactionService.connectTransactionsListToPrices(makeTxs(2), { skipUnlink: true })
    expect(prismaMock.pricesOnTransactions.deleteMany).not.toHaveBeenCalled()

    await transactionService.connectTransactionsListToPrices(makeTxs(2))
    expect(prismaMock.pricesOnTransactions.deleteMany).toHaveBeenCalledWith({
      where: { transactionId: { in: ['tx-0', 'tx-1'] } }
    })
  })

  it('records txs whose link replacement failed so a later run relinks them', async () => {
    await clearPendingRelinks()
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    prismaMock.$transaction.mockRejectedValue(new Error('Transaction already closed'))

    await transactionService.connectTransactionsListToPrices(makeTxs(2))

    expect((await redis.smembers(PRICE_RELINK_PENDING_KEY)).sort((a, b) => a.localeCompare(b))).toEqual(['tx-0', 'tx-1'])
    await clearPendingRelinks()
    errorSpy.mockRestore()
  })

  it('does not record failed txs that had no links (the no-prices pass finds them)', async () => {
    await clearPendingRelinks()
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    prismaMock.$transaction.mockRejectedValue(new Error('Transaction already closed'))

    await transactionService.connectTransactionsListToPrices(makeTxs(2), { skipUnlink: true })

    expect(await redis.smembers(PRICE_RELINK_PENDING_KEY)).toEqual([])
    errorSpy.mockRestore()
  })
})

describe('connectAllTransactionsToPrices', () => {
  const dayTs = moment.utc('2026-08-02').unix()
  const usd = { ...mockedUSDPriceOnTransaction.price, id: 11, timestamp: dayTs, networkId: 1 }
  const cad = { ...mockedCADPriceOnTransaction.price, id: 12, timestamp: dayTs, networkId: 1 }
  const page = [
    { id: 'a', timestamp: dayTs + 60, address: { networkId: 1, address: 'ecash:addr-a' } },
    { id: 'b', timestamp: dayTs + 120, address: { networkId: 1, address: 'ecash:addr-b' } }
  ]
  let invalidate: jest.SpyInstance

  beforeEach(() => {
    prisma.$transaction = prismaMock.$transaction
    prisma.price.findMany = prismaMock.price.findMany
    prisma.pricesOnTransactions.deleteMany = prismaMock.pricesOnTransactions.deleteMany
    prisma.pricesOnTransactions.createMany = prismaMock.pricesOnTransactions.createMany
    prisma.pricesOnTransactions.groupBy = prismaMock.pricesOnTransactions.groupBy
    prisma.transaction.findMany = prismaMock.transaction.findMany
    prismaMock.price.findMany.mockResolvedValue([usd, cad])
    prismaMock.pricesOnTransactions.createMany.mockResolvedValue({ count: 0 })
    ;(prismaMock.pricesOnTransactions.groupBy as unknown as jest.Mock).mockResolvedValue([])
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock))
    prismaMock.transaction.findMany
      .mockResolvedValueOnce(page as any)
      .mockResolvedValue([])
    invalidate = jest.spyOn(CacheSet, 'addressesSynced').mockResolvedValue()
  })

  afterEach(() => {
    invalidate.mockRestore()
  })

  it('pages through unpriced txs by id and links them without unlinking', async () => {
    await transactionService.connectAllTransactionsToPrices()

    const firstQuery = prismaMock.transaction.findMany.mock.calls[0][0] as any
    const secondQuery = prismaMock.transaction.findMany.mock.calls[1][0] as any
    expect(firstQuery.where).toEqual({ prices: { none: {} } })
    expect(firstQuery.orderBy).toEqual({ id: 'asc' })
    expect(secondQuery.where).toEqual({ prices: { none: {} }, id: { gt: 'b' } })
    expect(prismaMock.pricesOnTransactions.createMany).toHaveBeenCalledWith({
      data: [
        { transactionId: 'a', priceId: 11 }, { transactionId: 'a', priceId: 12 },
        { transactionId: 'b', priceId: 11 }, { transactionId: 'b', priceId: 12 }
      ],
      skipDuplicates: true
    })
    expect(prismaMock.pricesOnTransactions.deleteMany).not.toHaveBeenCalled()
  })

  it('invalidates the caches of addresses whose txs got linked', async () => {
    await transactionService.connectAllTransactionsToPrices()

    expect(invalidate).toHaveBeenCalledWith(['ecash:addr-a', 'ecash:addr-b'])
  })

  it('does not invalidate caches when no tx could be linked', async () => {
    prismaMock.price.findMany.mockResolvedValue([])
    const fetchMissing = jest.spyOn(priceService, 'fetchAndStoreMissingPrices').mockResolvedValue([])

    await transactionService.connectAllTransactionsToPrices()

    expect(invalidate).not.toHaveBeenCalled()
    fetchMissing.mockRestore()
  })

  it('still invalidates addresses linked before a later page query fails', async () => {
    prismaMock.transaction.findMany.mockReset()
    prismaMock.transaction.findMany
      .mockResolvedValueOnce(page as any)
      .mockRejectedValueOnce(new Error('db down'))

    await expect(transactionService.connectAllTransactionsToPrices()).rejects.toThrow('db down')

    expect(invalidate).toHaveBeenCalledWith(['ecash:addr-a', 'ecash:addr-b'])
  })

  it('retries a failed cache invalidation on the next run', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    invalidate.mockRejectedValueOnce(new Error('redis down'))

    await transactionService.connectAllTransactionsToPrices()
    // Nothing left to link on the second run; the pending addresses are retried.
    await transactionService.connectAllTransactionsToPrices()

    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(invalidate.mock.calls[1][0]).toEqual(['ecash:addr-a', 'ecash:addr-b'])
    errorSpy.mockRestore()
  })

  it('relinks txs recorded as pending and clears them from the pending set', async () => {
    await clearPendingRelinks()
    await redis.sadd(PRICE_RELINK_PENDING_KEY, 'r1', 'deleted-tx')
    const pendingTx = { id: 'r1', timestamp: dayTs + 60, address: { networkId: 1, address: 'ecash:addr-r' } }
    prismaMock.pricesOnTransactions.deleteMany.mockResolvedValue({ count: 2 })
    prismaMock.transaction.findMany.mockReset()
    prismaMock.transaction.findMany
      .mockResolvedValueOnce([]) // no unpriced txs
      .mockResolvedValueOnce([]) // no irregular txs
      .mockResolvedValueOnce([pendingTx] as any) // pending relinks (deleted-tx no longer exists)

    await transactionService.connectAllTransactionsToPrices()

    expect(prismaMock.pricesOnTransactions.deleteMany).toHaveBeenCalledWith({ where: { transactionId: { in: ['r1'] } } })
    expect(prismaMock.pricesOnTransactions.createMany).toHaveBeenCalledWith({
      data: [{ transactionId: 'r1', priceId: 11 }, { transactionId: 'r1', priceId: 12 }],
      skipDuplicates: true
    })
    expect(await redis.smembers(PRICE_RELINK_PENDING_KEY)).toEqual([])
    expect(invalidate).toHaveBeenCalledWith(['ecash:addr-r'])
  })

  it('makes a concurrent call wait for the run in progress instead of starting another', async () => {
    await Promise.all([
      transactionService.connectAllTransactionsToPrices(),
      transactionService.connectAllTransactionsToPrices()
    ])

    expect(prismaMock.pricesOnTransactions.groupBy).toHaveBeenCalledTimes(1)
  })
})

describe('retryOnTransactionTimeout', () => {
  let timeoutSpy: jest.SpyInstance
  let warnSpy: jest.SpyInstance

  beforeEach(() => {
    timeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void) => { fn(); return 0 }) as any)
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    timeoutSpy.mockRestore()
    warnSpy.mockRestore()
  })

  it('retries once when the DB transaction timed out', async () => {
    const timeout = new Prisma.PrismaClientKnownRequestError('Transaction already closed', { code: 'P2028', clientVersion: 'test' })
    const fn = jest.fn().mockRejectedValueOnce(timeout).mockResolvedValueOnce('ok')

    await expect(transactionService.retryOnTransactionTimeout(fn)).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does not retry other errors', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('unique constraint'))

    await expect(transactionService.retryOnTransactionTimeout(fn)).rejects.toThrow('unique constraint')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('createManyTransactionsForSync with an overlapping sync', () => {
  const row = (hash: string): any => ({ hash, addressId: 'addr-1', amount: new Prisma.Decimal(1), timestamp: 1700000000, confirmed: true })

  beforeEach(() => {
    prisma.$transaction = prismaMock.$transaction
    prisma.transaction.findMany = prismaMock.transaction.findMany
    prisma.transaction.createMany = prismaMock.transaction.createMany
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock))
    prismaMock.transaction.createMany.mockResolvedValue({ count: 1 })
  })

  it('only reports the rows this call created, identified by the ids it generated', async () => {
    prismaMock.transaction.findMany
      .mockResolvedValueOnce([]) // neither tx existed when checked
      .mockImplementationOnce((async (args: any) => {
        // A concurrent sync inserted h2 first, so only our h1 row exists with one of our ids.
        const ourIds: string[] = args.where.id.in
        return [{ id: ourIds[0], hash: 'h1', addressId: 'addr-1', amount: new Prisma.Decimal(1), timestamp: 1700000000, confirmed: true }]
      }) as any)

    const result = await transactionService.createManyTransactionsForSync([row('h1'), row('h2')])

    const createManyData = (prismaMock.transaction.createMany.mock.calls[0][0] as any).data
    expect(createManyData).toHaveLength(2)
    expect(createManyData.every((r: any) => typeof r.id === 'string' && r.id.length > 0)).toBe(true)
    const lookup = prismaMock.transaction.findMany.mock.calls[1][0] as any
    expect(lookup.where).toEqual({ id: { in: createManyData.map((r: any) => r.id) } })
    expect(result.inserted.map(t => t.hash)).toEqual(['h1'])
    expect(result.insertedCount).toBe(1)
  })
})

describe('invalidateCachesForAddresses', () => {
  it('keeps addresses whose invalidation failed and retries them on the next call', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const invalidate = jest.spyOn(CacheSet, 'addressesSynced')
      .mockRejectedValueOnce(new Error('redis down'))
      .mockResolvedValue()

    await transactionService.invalidateCachesForAddresses(['ecash:a'])
    await transactionService.invalidateCachesForAddresses(['ecash:b'])

    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(invalidate.mock.calls[1][0]).toEqual(['ecash:a', 'ecash:b'])
    invalidate.mockRestore()
    errorSpy.mockRestore()
  })
})
