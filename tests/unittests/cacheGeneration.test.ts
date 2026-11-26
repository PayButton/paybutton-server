import { EventEmitter } from 'events'
import { Address } from '@prisma/client'
import { CacheSet } from 'redis/index'
import * as paymentCache from 'redis/paymentCache'
import { clearBalanceCache, getBalanceForAddress } from 'redis/balanceCache'
import * as addressService from 'services/addressService'

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
      for (let i = 1; i < keys.length; i++) store.set(keys[i], args[i])
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

const mockedGenerate = paymentCache.generateAndCacheGroupedPaymentsAndInfoForAddress as jest.Mock
const mockedGenerateBalance = addressService.generateAddressPaymentInfo as jest.Mock

const address = { id: 'addr-1', address: 'ecash:addr-1' } as unknown as Address
const rebuilt = {
  groupedPayments: { 'ecash:addr-1:payments:2024:01': [{ hash: 'h1' }] },
  info: { balance: '1', paymentCount: 1 }
}

describe('cache rebuilds vs invalidation', () => {
  beforeEach(() => {
    store.clear()
    mockedGenerate.mockReset()
    mockedGenerateBalance.mockReset()
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('writes the rebuilt payment and balance caches when nothing invalidated them', async () => {
    mockedGenerate.mockResolvedValue(rebuilt)

    await expect(CacheSet.addressCreation(address)).resolves.toBe(true)

    expect(store.get('ecash:addr-1:payments:2024:01')).toBe(JSON.stringify([{ hash: 'h1' }]))
    expect(store.get('ecash:addr-1:balance')).toBe(JSON.stringify(rebuilt.info))
  })

  it('discards a rebuild if the address is invalidated while its txs are being read', async () => {
    mockedGenerate.mockImplementation(async () => {
      // e.g. prices linked for one of its txs, then its caches invalidated
      await paymentCache.clearPaymentCacheForAddress(address.address)
      return rebuilt
    })

    await expect(CacheSet.addressCreation(address)).resolves.toBe(false)

    expect(store.has('ecash:addr-1:payments:2024:01')).toBe(false)
    expect(store.has('ecash:addr-1:balance')).toBe(false)
  })

  it('rebuilds normally after an earlier invalidation', async () => {
    await paymentCache.clearPaymentCacheForAddress(address.address)
    mockedGenerate.mockResolvedValue(rebuilt)

    await expect(CacheSet.addressCreation(address)).resolves.toBe(true)
  })

  it('does not cache a balance computed before a balance invalidation', async () => {
    mockedGenerateBalance.mockImplementation(async () => {
      await clearBalanceCache(address.address)
      return rebuilt.info
    })

    await expect(getBalanceForAddress(address.address)).resolves.toEqual(rebuilt.info)

    expect(store.has('ecash:addr-1:balance')).toBe(false)
  })

  it('caches a balance computed without interference', async () => {
    mockedGenerateBalance.mockResolvedValue(rebuilt.info)

    await getBalanceForAddress(address.address)

    expect(store.get('ecash:addr-1:balance')).toBe(JSON.stringify(rebuilt.info))
  })
})
