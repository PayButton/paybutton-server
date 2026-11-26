import { invalidateCachesAfterBlockchainSync } from '../../jobs/workers'
import { clearPaymentCacheForAddress } from '../../redis/paymentCache'
import { clearBalanceCache } from '../../redis/balanceCache'
import { clearDashboardCache } from '../../redis/dashboardCache'
import { fetchAllAddresses } from '../../services/addressService'
import { fetchAllUsers, fetchUsersForAddresses } from '../../services/userService'

jest.mock('bullmq', () => ({ Worker: jest.fn() }))
jest.mock('../../redis/clientInstance', () => ({ redisBullMQ: {} }))
jest.mock('../../redis/paymentCache', () => ({ clearPaymentCacheForAddress: jest.fn() }))
jest.mock('../../redis/balanceCache', () => ({ clearBalanceCache: jest.fn() }))
jest.mock('../../redis/dashboardCache', () => ({ clearDashboardCache: jest.fn() }))
jest.mock('../../services/addressService', () => ({ fetchAllAddresses: jest.fn() }))
jest.mock('../../services/userService', () => ({
  fetchAllUsers: jest.fn(),
  fetchUsersForAddresses: jest.fn()
}))
jest.mock('../../services/clientPaymentService', () => ({ cleanupExpiredClientPayments: jest.fn() }))
jest.mock('../../services/chronikService', () => ({ multiBlockchainClient: {} }))
jest.mock('../../services/transactionService', () => ({ connectAllTransactionsToPrices: jest.fn() }))
jest.mock('../../services/priceService', () => ({}))

describe('invalidateCachesAfterBlockchainSync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('only clears the changed addresses and the dashboards of their users', async () => {
    ;(fetchUsersForAddresses as jest.Mock).mockResolvedValue([{ id: 'user-1' }])

    await invalidateCachesAfterBlockchainSync(['ecash:a', 'ecash:b', 'ecash:a'])

    expect(fetchAllAddresses).not.toHaveBeenCalled()
    expect(fetchAllUsers).not.toHaveBeenCalled()
    expect((clearPaymentCacheForAddress as jest.Mock).mock.calls.map(c => c[0] as string).sort((a, b) => a.localeCompare(b))).toEqual(['ecash:a', 'ecash:b'])
    expect((clearBalanceCache as jest.Mock).mock.calls.map(c => c[0] as string).sort((a, b) => a.localeCompare(b))).toEqual(['ecash:a', 'ecash:b'])
    expect(fetchUsersForAddresses).toHaveBeenCalledWith(['ecash:a', 'ecash:b'])
    expect(clearDashboardCache).toHaveBeenCalledTimes(1)
    expect(clearDashboardCache).toHaveBeenCalledWith('user-1')
  })

  it('clears nothing when no address changed', async () => {
    ;(fetchUsersForAddresses as jest.Mock).mockResolvedValue([])

    await invalidateCachesAfterBlockchainSync([])

    expect(clearPaymentCacheForAddress).not.toHaveBeenCalled()
    expect(clearDashboardCache).not.toHaveBeenCalled()
  })

  it('falls back to clearing every cache when the changed addresses are unknown', async () => {
    ;(fetchAllAddresses as jest.Mock).mockResolvedValue([{ address: 'ecash:a' }, { address: 'ecash:c' }])
    ;(fetchAllUsers as jest.Mock).mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }])

    await invalidateCachesAfterBlockchainSync(undefined)

    expect((clearPaymentCacheForAddress as jest.Mock).mock.calls.map(c => c[0] as string).sort((a, b) => a.localeCompare(b))).toEqual(['ecash:a', 'ecash:c'])
    expect(fetchUsersForAddresses).not.toHaveBeenCalled()
    expect(clearDashboardCache).toHaveBeenCalledTimes(2)
  })
})
