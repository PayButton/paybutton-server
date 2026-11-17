import { CacheGet } from 'redis/index'
import * as dashboardCache from 'redis/dashboardCache'
import { DashboardData } from 'redis/types'

jest.mock('redis/dashboardCache', () => ({
  ...jest.requireActual('redis/dashboardCache'),
  getUserDashboardData: jest.fn()
}))

const mockedGetUserDashboardData = dashboardCache.getUserDashboardData as jest.MockedFunction<typeof dashboardCache.getUserDashboardData>

describe('CacheGet.dashboardData', () => {
  beforeEach(() => {
    mockedGetUserDashboardData.mockReset()
  })

  it('shares one in-flight call between concurrent identical requests', async () => {
    let resolve: (d: DashboardData) => void = () => {}
    mockedGetUserDashboardData.mockReturnValue(new Promise(r => { resolve = r }))

    const first = CacheGet.dashboardData('user-1', 'UTC')
    const second = CacheGet.dashboardData('user-1', 'UTC')
    const data = { total: { payments: 3 } } as unknown as DashboardData
    resolve(data)

    await expect(first).resolves.toBe(data)
    await expect(second).resolves.toBe(data)
    expect(mockedGetUserDashboardData).toHaveBeenCalledTimes(1)
  })

  it('runs separately for different arguments', async () => {
    mockedGetUserDashboardData.mockResolvedValue({} as unknown as DashboardData)

    await Promise.all([
      CacheGet.dashboardData('user-1', 'UTC'),
      CacheGet.dashboardData('user-1', 'UTC', ['button-a']),
      CacheGet.dashboardData('user-2', 'UTC')
    ])
    expect(mockedGetUserDashboardData).toHaveBeenCalledTimes(3)
  })

  it('releases the call after a failure so the next request retries', async () => {
    mockedGetUserDashboardData.mockRejectedValueOnce(new Error('boom'))
    mockedGetUserDashboardData.mockResolvedValueOnce({} as unknown as DashboardData)

    await expect(CacheGet.dashboardData('user-1', 'UTC')).rejects.toThrow('boom')
    await expect(CacheGet.dashboardData('user-1', 'UTC')).resolves.toEqual({})
    expect(mockedGetUserDashboardData).toHaveBeenCalledTimes(2)
  })
})
