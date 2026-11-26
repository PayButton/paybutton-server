import { SyncProgressTracker, SYNC_PROGRESS_KEY } from '../../redis/syncProgress'
import { redis } from '../../redis/clientInstance'

jest.mock('../../redis/clientInstance', () => ({
  redis: { set: jest.fn(), get: jest.fn() }
}))

const lastWritten = (): any => {
  const calls = (redis.set as jest.Mock).mock.calls
  return JSON.parse(calls[calls.length - 1][1])
}

describe('SyncProgressTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('records phases, network progress and completion', async () => {
    const tracker = new SyncProgressTracker()
    await tracker.start()
    await tracker.startPhase('prices')
    await tracker.startPhase('transactions')
    tracker.startNetwork('ecash', 10)
    tracker.addressesDone('ecash', 4)
    tracker.txsCommitted('ecash', 200)
    tracker.txsCommitted('ecash', 50)
    tracker.addressesFailed('ecash', { 'ecash:a': 'boom\nstack line' })
    tracker.finishNetwork('ecash')
    await tracker.finish('completed')

    expect((redis.set as jest.Mock).mock.calls[0][0]).toBe(SYNC_PROGRESS_KEY)
    const state = lastWritten()
    expect(state.status).toBe('completed')
    expect(state.currentPhase).toBeUndefined()
    expect(state.phases.prices.finishedAt).toBeDefined()
    expect(state.phases.transactions.finishedAt).toBeDefined()
    expect(state.networks.ecash).toMatchObject({
      totalAddresses: 10,
      addressesDone: 4,
      txsCommitted: 250,
      failedCount: 1,
      failedAddresses: [{ address: 'ecash:a', error: 'boom' }]
    })
  })

  it('keeps the phase that was running when the job failed', async () => {
    const tracker = new SyncProgressTracker()
    await tracker.start()
    await tracker.startPhase('priceLinking')
    await tracker.finish('failed', 'db down')

    const state = lastWritten()
    expect(state.status).toBe('failed')
    expect(state.failedPhase).toBe('priceLinking')
    expect(state.error).toBe('db down')
  })

  it('throttles writes of frequent counter updates', async () => {
    const tracker = new SyncProgressTracker()
    tracker.startNetwork('ecash', 100)
    for (let i = 0; i < 50; i++) tracker.addressesDone('ecash', 1)
    expect(redis.set).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1000)
    await Promise.resolve()
    expect(redis.set).toHaveBeenCalledTimes(1)
    expect(lastWritten().networks.ecash.addressesDone).toBe(50)
  })

  it('does not throw when redis fails', async () => {
    ;(redis.set as jest.Mock).mockRejectedValueOnce(new Error('redis down'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const tracker = new SyncProgressTracker()
    await expect(tracker.start()).resolves.toBeUndefined()
    await tracker.finish('completed')
  })
})
