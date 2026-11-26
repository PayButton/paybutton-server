import { Address } from '@prisma/client'
import moment from 'moment-timezone'
import { CacheSet } from 'redis/index'
import { getPaymentList, getPaymentStream } from 'redis/paymentCache'
import { getCacheBuiltKey } from 'redis/cacheGeneration'
import * as addressService from 'services/addressService'
import * as paybuttonService from 'services/paybuttonService'
import * as transactionService from 'services/transactionService'
import { PAYMENT_WEEK_KEY_FORMAT } from 'constants/index'

const weekKeyFor = (addressString: string, timestamp: number): string =>
  `${addressString}:payments:${moment.unix(timestamp).format(PAYMENT_WEEK_KEY_FORMAT)}`

// In-memory stand-in for the commands the payment cache reads with.
const store = new Map<string, string>()
const scanStream = jest.fn()
// Runs before each MGET is served, to change the store between existence checks and reads.
let beforeMget = (): void => {}
jest.mock('redis/clientInstance', () => ({
  redis: {
    get: async (key: string) => store.get(key) ?? null,
    mget: async (keys: string[]) => {
      beforeMget()
      return keys.map(k => store.get(k) ?? null)
    },
    set: async (key: string, value: string) => { store.set(key, value) },
    del: async (key: string) => { store.delete(key) },
    pipeline: (commands: string[][]) => ({
      exec: async () => commands.map(([cmd, key]) => {
        if (cmd !== 'exists') throw new Error(`unexpected pipelined command ${cmd}`)
        return [null, store.has(key) ? 1 : 0]
      })
    }),
    scanStream: (...args: unknown[]) => scanStream(...args)
  }
}))

// Plain factories (no requireActual): these modules import each other, and
// loading the real ones here would hand paymentCache other copies of the mocks.
jest.mock('redis/index', () => ({
  CacheSet: { addressCreation: jest.fn() },
  dropCachesBuiltWithoutAddressTxs: jest.fn(),
  isAddressRebuildBackedOff: jest.fn(() => false)
}))

jest.mock('services/addressService', () => ({
  fetchAllUserAddresses: jest.fn()
}))

jest.mock('services/paybuttonService', () => ({
  fetchPaybuttonArrayByUserId: jest.fn()
}))

jest.mock('services/transactionService', () => ({
  fetchTxTimestampRangesByAddressId: jest.fn(),
  generateTransactionsWithPaybuttonsAndPricesForAddress: jest.fn(),
  getTransactionValue: jest.fn(),
  getOldestPositiveTxForUser: jest.fn()
}))

const mockedAddressCreation = CacheSet.addressCreation as jest.Mock
const mockedFetchAddresses = addressService.fetchAllUserAddresses as jest.Mock
const mockedFetchButtons = paybuttonService.fetchPaybuttonArrayByUserId as jest.Mock
const mockedFetchRanges = transactionService.fetchTxTimestampRangesByAddressId as jest.Mock

// Background rebuilds are tracked per user for the process, so each test uses its own.
let userCounter = 0
let userId: string

const makeAddress = (n: number): Address => ({ id: `addr-id-${n}`, address: `ecash:addr-${n}` }) as unknown as Address

const payment = (hash: string, timestamp: number, buttonIds: string[]): unknown => ({
  hash,
  timestamp,
  values: { usd: '1', cad: '1' },
  buttonDisplayDataList: buttonIds.map(id => ({ id, name: id }))
})

const cacheWeek = (address: Address, payments: Array<{ hash: string, timestamp: number }>): void => {
  store.set(weekKeyFor(address.address, payments[0].timestamp), JSON.stringify(payments))
}

const collect = async (stream: AsyncGenerator<{ hash: string }>): Promise<string[]> => {
  const hashes: string[] = []
  for await (const p of stream) hashes.push(p.hash)
  return hashes.sort()
}

describe('payment cache week key lookup', () => {
  beforeEach(() => {
    store.clear()
    beforeMget = () => {}
    jest.clearAllMocks()
    userCounter++
    userId = `user-${userCounter}`
    mockedFetchButtons.mockResolvedValue([{ id: 'button-1' }])
    mockedAddressCreation.mockResolvedValue(true)
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('reads every cached week in the address\'s tx range, across year boundaries, without scanning', async () => {
    const address = makeAddress(1)
    // Late December and early January land in ISO weeks named after the other year.
    const timestamps = [
      moment('2024-06-15T12:00:00').unix(),
      moment('2024-12-30T12:00:00').unix(),
      moment('2025-01-02T12:00:00').unix(),
      moment('2026-01-01T12:00:00').unix()
    ]
    timestamps.forEach((ts, i) => cacheWeek(address, [payment(`h${i}`, ts, ['button-1']) as any]))
    mockedFetchAddresses.mockResolvedValue([address])
    mockedFetchRanges.mockResolvedValue(new Map([[address.id, { min: timestamps[0], max: timestamps[3] }]]))

    await expect(collect(getPaymentStream(userId) as any)).resolves.toEqual(['h0', 'h1', 'h2', 'h3'])
    expect(scanStream).not.toHaveBeenCalled()
    expect(mockedAddressCreation).not.toHaveBeenCalled()
  })

  it('reads a week cached after the address\'s newest tx was read, up to now', async () => {
    const address = makeAddress(2)
    const old = moment().subtract(60, 'days').unix()
    const recent = moment().subtract(1, 'hour').unix()
    cacheWeek(address, [payment('old', old, ['button-1']) as any])
    cacheWeek(address, [payment('recent', recent, ['button-1']) as any])
    mockedFetchAddresses.mockResolvedValue([address])
    mockedFetchRanges.mockResolvedValue(new Map([[address.id, { min: old, max: old }]]))

    await expect(collect(getPaymentStream(userId) as any)).resolves.toEqual(['old', 'recent'])
  })

  it('keeps only the user\'s own buttons on each payment', async () => {
    const address = makeAddress(3)
    const ts = moment('2025-03-10T12:00:00').unix()
    cacheWeek(address, [payment('h', ts, ['button-1', 'someone-elses-button']) as any])
    mockedFetchAddresses.mockResolvedValue([address])
    mockedFetchRanges.mockResolvedValue(new Map([[address.id, { min: ts, max: ts }]]))

    const payments = await getPaymentList(userId)

    expect(payments).toHaveLength(1)
    expect(payments[0].buttonDisplayDataList.map(b => b.id)).toEqual(['button-1'])
  })

  it('rebuilds only addresses that have neither the built marker nor any cached week', async () => {
    const ts = moment('2025-03-10T12:00:00').unix()
    const legacyCached = makeAddress(4) // cached before the built marker existed
    const builtEmpty = makeAddress(5) // rebuilt, but has no payments to cache
    const uncached = makeAddress(6)
    const noTxs = makeAddress(7)
    cacheWeek(legacyCached, [payment('h', ts, ['button-1']) as any])
    store.set(getCacheBuiltKey(builtEmpty.address), '1')
    mockedFetchAddresses.mockResolvedValue([legacyCached, builtEmpty, uncached, noTxs])
    mockedFetchRanges.mockResolvedValue(new Map([
      [legacyCached.id, { min: ts, max: ts }],
      [builtEmpty.id, { min: ts, max: ts }],
      [uncached.id, { min: ts, max: ts }]
    ]))

    await expect(collect(getPaymentStream(userId) as any)).resolves.toEqual(['h'])

    expect(mockedAddressCreation.mock.calls.map(([a]) => a.address)).toEqual([uncached.address, noTxs.address])
  })

  it('skips a week deleted between the existence check and the read', async () => {
    const address = makeAddress(8)
    const ts = moment('2025-03-10T12:00:00').unix()
    cacheWeek(address, [payment('h', ts, ['button-1']) as any])
    mockedFetchAddresses.mockResolvedValue([address])
    mockedFetchRanges.mockImplementation(async () => new Map([[address.id, { min: ts, max: ts }]]))
    beforeMget = () => store.clear()

    await expect(collect(getPaymentStream(userId) as any)).resolves.toEqual([])
  })
})
