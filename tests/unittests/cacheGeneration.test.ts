import { EventEmitter } from 'events'
import { Address, Prisma } from '@prisma/client'
import { CacheSet } from 'redis/index'
import * as paymentCache from 'redis/paymentCache'
import { clearBalanceCache, getBalanceForAddress } from 'redis/balanceCache'
import * as addressService from 'services/addressService'
import * as transactionService from 'services/transactionService'
import * as userService from 'services/userService'
import moment from 'moment-timezone'
import { PAYMENT_WEEK_KEY_FORMAT } from 'constants/index'

const weekKeyFor = (addressString: string, timestamp: number): string =>
  `${addressString}:payments:${moment.unix(timestamp).format(PAYMENT_WEEK_KEY_FORMAT)}`

// In-memory stand-in for the commands the caches use. eval mirrors the
// generation-check script in redis/cacheGeneration.ts (that script is the only
// one run through eval).
const store = new Map<string, string>()
jest.mock('redis/clientInstance', () => ({
  redis: {
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: string) => { store.set(key, value) },
    del: async (key: string) => { store.delete(key) },
    incr: async (key: string) => {
      const next = Number(store.get(key) ?? '0') + 1
      store.set(key, String(next))
      return next
    },
    eval: async (_script: string, numKeys: number, ...rest: string[]) => {
      const keys = rest.slice(0, numKeys)
      const args = rest.slice(numKeys)
      if ((store.get(keys[0]) ?? '0') !== args[0]) return 0
      if (args[1] === '1' && !store.has(keys[1])) return 0
      for (let i = 2; i < keys.length; i++) store.set(keys[i], args[i])
      return 1
    },
    scanStream: ({ match }: { match: string }) => {
      const emitter = new EventEmitter()
      const prefix = match.replace(/\*$/, '')
      process.nextTick(() => {
        emitter.emit('data', [...store.keys()].filter(k => k.startsWith(prefix)))
        emitter.emit('end')
      })
      return emitter
    }
  }
}))

jest.mock('redis/paymentCache', () => ({
  ...jest.requireActual('redis/paymentCache'),
  generateAndCacheGroupedPaymentsAndInfoForAddress: jest.fn()
}))

jest.mock('services/addressService', () => ({
  ...jest.requireActual('services/addressService'),
  generateAddressPaymentInfo: jest.fn()
}))

jest.mock('services/transactionService', () => ({
  ...jest.requireActual('services/transactionService'),
  fetchTransactionsWithPaybuttonsAndPricesTouchedSince: jest.fn()
}))

jest.mock('services/userService', () => ({
  ...jest.requireActual('services/userService'),
  fetchUsersForAddress: jest.fn(async () => [{ id: 'user-1' }])
}))

const mockedGenerate = paymentCache.generateAndCacheGroupedPaymentsAndInfoForAddress as jest.Mock
const mockedGenerateBalance = addressService.generateAddressPaymentInfo as jest.Mock
const mockedTouchedSince = transactionService.fetchTransactionsWithPaybuttonsAndPricesTouchedSince as jest.Mock

// Rebuild bookkeeping (in-flight rebuilds, failure backoff) is per address and
// lives for the process, so each test uses its own address.
let addressCounter = 0
let address: Address
let rebuilt: { groupedPayments: Record<string, unknown[]>, info: { balance: string, paymentCount: number } }
let weekKey: string

// A priced incoming tx, as fetchTransactionsWithPaybuttonsAndPricesTouchedSince returns it.
const pricedTx = (hash: string, timestamp: number): unknown => ({
  id: `id-${hash}`,
  hash,
  amount: new Prisma.Decimal(5),
  timestamp,
  address: { address: address.address, networkId: 1, paybuttons: [] },
  prices: [
    { price: { quoteId: 1, value: new Prisma.Decimal(2) } },
    { price: { quoteId: 2, value: new Prisma.Decimal(3) } }
  ]
})

describe('cache rebuilds vs invalidation', () => {
  beforeEach(() => {
    store.clear()
    mockedGenerate.mockReset()
    mockedGenerateBalance.mockReset()
    mockedTouchedSince.mockReset()
    ;(userService.fetchUsersForAddress as jest.Mock).mockResolvedValue([{ id: 'user-1' }])
    addressCounter++
    address = { id: `addr-${addressCounter}`, address: `ecash:addr-${addressCounter}` } as unknown as Address
    weekKey = `${address.address}:payments:2024:01`
    rebuilt = {
      groupedPayments: { [weekKey]: [{ hash: 'h1' }] },
      info: { balance: '1', paymentCount: 1 }
    }
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('writes the rebuilt payment and balance caches when nothing invalidated them', async () => {
    mockedGenerate.mockResolvedValue(rebuilt)

    await expect(CacheSet.addressCreation(address)).resolves.toBe(true)

    expect(store.get(weekKey)).toBe(JSON.stringify([{ hash: 'h1' }]))
    expect(store.get(`${address.address}:balance`)).toBe(JSON.stringify(rebuilt.info))
    expect(mockedTouchedSince).not.toHaveBeenCalled()
  })

  it('keeps a rebuild invalidated mid-read and re-applies the txs touched since it started', async () => {
    const ts = 1710000000
    const newTx = pricedTx('h-new', ts)
    mockedGenerate.mockImplementation(async () => {
      // e.g. a new tx for the address arrives, or prices are linked and its caches invalidated
      await paymentCache.clearPaymentCacheForAddress(address.address)
      return rebuilt
    })
    mockedTouchedSince.mockResolvedValue([newTx])
    mockedGenerateBalance.mockResolvedValue({ balance: '6', paymentCount: 2 })

    await expect(CacheSet.addressCreation(address)).resolves.toBe(true)

    expect(store.get(weekKey)).toBe(JSON.stringify([{ hash: 'h1' }]))
    const patchedWeek = JSON.parse(store.get(weekKeyFor(address.address, ts)) as string)
    expect(patchedWeek.map((p: { hash: string }) => p.hash)).toContain('h-new')
    expect(store.get(`${address.address}:balance`)).toBe(JSON.stringify({ balance: '6', paymentCount: 2 }))
    const since = mockedTouchedSince.mock.calls[0][1] as Date
    expect(since.getTime()).toBeLessThan(Date.now())
  })

  it('replaces a touched tx in its week and drops it if it no longer qualifies', async () => {
    const ts = 1704500000
    const key = weekKeyFor(address.address, ts)
    rebuilt.groupedPayments = { [key]: [{ hash: 'h1' }, { hash: 'h-gone' }] }
    mockedGenerate.mockImplementation(async () => {
      await paymentCache.clearPaymentCacheForAddress(address.address)
      return rebuilt
    })
    // Now unpriced (e.g. prices unlinked for relinking): a rebuild would leave it out.
    const unpriced = { ...(pricedTx('h-gone', ts) as object), prices: [] }
    mockedTouchedSince.mockResolvedValue([unpriced])
    mockedGenerateBalance.mockResolvedValue(rebuilt.info)

    await CacheSet.addressCreation(address)

    expect(JSON.parse(store.get(key) as string)).toEqual([{ hash: 'h1' }])
  })

  it('does not patch weeks into a cache cleared during the catch-up', async () => {
    const ts = 1704500000
    mockedGenerate.mockImplementation(async () => {
      await paymentCache.clearPaymentCacheForAddress(address.address)
      return rebuilt
    })
    mockedTouchedSince.mockImplementation(async () => {
      await paymentCache.clearPaymentCacheForAddress(address.address)
      return [pricedTx('h-new', ts)]
    })
    mockedGenerateBalance.mockResolvedValue(rebuilt.info)

    await expect(CacheSet.addressCreation(address)).resolves.toBe(true)

    expect(store.has(weekKeyFor(address.address, ts))).toBe(false)
    expect(mockedTouchedSince).toHaveBeenCalledTimes(1)
  })

  it('shares one rebuild between concurrent callers for the same address', async () => {
    let finish: (v: typeof rebuilt) => void = () => {}
    mockedGenerate.mockImplementation(async () => await new Promise(resolve => { finish = resolve }))

    const first = CacheSet.addressCreation(address)
    const second = CacheSet.addressCreation(address)
    await new Promise(resolve => setImmediate(resolve))
    finish(rebuilt)

    await expect(Promise.all([first, second])).resolves.toEqual([true, true])
    expect(mockedGenerate).toHaveBeenCalledTimes(1)
  })

  it('backs off after a failed rebuild instead of restarting it on every request', async () => {
    mockedGenerate.mockRejectedValueOnce(new Error('db unreachable'))

    await expect(CacheSet.addressCreation(address)).rejects.toThrow('db unreachable')
    await expect(CacheSet.addressCreation(address)).resolves.toBe(false)

    expect(mockedGenerate).toHaveBeenCalledTimes(1)
  })

  it('initPaymentCache starts the rebuild without waiting for it', async () => {
    let finish: (v: typeof rebuilt) => void = () => {}
    mockedGenerate.mockImplementation(async () => await new Promise(resolve => { finish = resolve }))

    await expect(paymentCache.initPaymentCache(address)).resolves.toBe(true)
    expect(store.has(weekKey)).toBe(false)

    // A tx arriving meanwhile shares the running rebuild rather than starting another.
    await expect(paymentCache.initPaymentCache(address)).resolves.toBe(true)
    await new Promise(resolve => setImmediate(resolve))
    expect(mockedGenerate).toHaveBeenCalledTimes(1)

    finish(rebuilt)
    await new Promise(resolve => setImmediate(resolve))
    await new Promise(resolve => setImmediate(resolve))
    expect(store.get(weekKey)).toBe(JSON.stringify([{ hash: 'h1' }]))
  })

  it('rebuilds normally after an earlier invalidation', async () => {
    await paymentCache.clearPaymentCacheForAddress(address.address)
    mockedGenerate.mockResolvedValue(rebuilt)

    await expect(CacheSet.addressCreation(address)).resolves.toBe(true)
    expect(mockedTouchedSince).not.toHaveBeenCalled()
  })

  it('does not cache a balance computed before a balance invalidation', async () => {
    mockedGenerateBalance.mockImplementation(async () => {
      await clearBalanceCache(address.address)
      return rebuilt.info
    })

    await expect(getBalanceForAddress(address.address)).resolves.toEqual(rebuilt.info)

    expect(store.has(`${address.address}:balance`)).toBe(false)
  })

  it('caches a balance computed without interference', async () => {
    mockedGenerateBalance.mockResolvedValue(rebuilt.info)

    await getBalanceForAddress(address.address)

    expect(store.get(`${address.address}:balance`)).toBe(JSON.stringify(rebuilt.info))
  })
})
