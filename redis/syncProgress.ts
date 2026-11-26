import { redis } from './clientInstance'

/**
 * Live progress of the background blockchain sync job (jobs/workers.ts).
 * The job runs in the jobs process, so its progress is written to Redis for
 * the admin page (served by the Next.js process) to read.
 */
export const SYNC_PROGRESS_KEY = 'sync:progress'

export const SYNC_PHASES = ['prices', 'transactions', 'priceLinking', 'cacheInvalidation'] as const
export type SyncPhase = typeof SYNC_PHASES[number]

const MAX_FAILED_ADDRESSES_STORED = 50
const MAX_ERROR_LENGTH = 300
const FLUSH_THROTTLE_MS = 1000
const HEARTBEAT_INTERVAL_MS = 30 * 1000

export interface PhaseTiming {
  startedAt: number
  finishedAt?: number
}

export interface FailedAddress {
  address: string
  error: string
}

export interface NetworkSyncProgress {
  totalAddresses: number
  addressesDone: number
  txsCommitted: number
  failedCount: number
  failedAddresses: FailedAddress[]
  startedAt: number
  finishedAt?: number
}

export interface SyncJobProgress {
  status: 'running' | 'completed' | 'failed'
  startedAt: number
  finishedAt?: number
  // Refreshed by a heartbeat while running; a stale value means the job process likely died.
  updatedAt: number
  currentPhase?: SyncPhase
  // Phase that was running when the job failed.
  failedPhase?: SyncPhase
  phases: Partial<Record<SyncPhase, PhaseTiming>>
  networks: Record<string, NetworkSyncProgress>
  error?: string
}

const shortError = (err: string): string => {
  const firstLine = err.split('\n')[0]
  return firstLine.length > MAX_ERROR_LENGTH ? `${firstLine.slice(0, MAX_ERROR_LENGTH)}…` : firstLine
}

export class SyncProgressTracker {
  private readonly state: SyncJobProgress
  private flushTimer: NodeJS.Timeout | undefined
  private heartbeat: NodeJS.Timeout | undefined

  constructor () {
    const now = Date.now()
    this.state = {
      status: 'running',
      startedAt: now,
      updatedAt: now,
      phases: {},
      networks: {}
    }
  }

  getState (): SyncJobProgress {
    return this.state
  }

  async start (): Promise<void> {
    this.heartbeat = setInterval(() => { void this.flush() }, HEARTBEAT_INTERVAL_MS)
    this.heartbeat.unref?.()
    await this.flush()
  }

  async startPhase (phase: SyncPhase): Promise<void> {
    const now = Date.now()
    this.closeCurrentPhase(now)
    this.state.currentPhase = phase
    this.state.phases[phase] = { startedAt: now }
    await this.flush()
  }

  startNetwork (networkSlug: string, totalAddresses: number): void {
    this.state.networks[networkSlug] = {
      totalAddresses,
      addressesDone: 0,
      txsCommitted: 0,
      failedCount: 0,
      failedAddresses: [],
      startedAt: Date.now()
    }
    this.scheduleFlush()
  }

  addressesDone (networkSlug: string, count: number): void {
    const net = this.state.networks[networkSlug]
    if (net === undefined) return
    net.addressesDone += count
    this.scheduleFlush()
  }

  txsCommitted (networkSlug: string, count: number): void {
    const net = this.state.networks[networkSlug]
    if (net === undefined) return
    net.txsCommitted += count
    this.scheduleFlush()
  }

  addressesFailed (networkSlug: string, failed: Record<string, string>): void {
    const net = this.state.networks[networkSlug]
    if (net === undefined) return
    const entries = Object.entries(failed)
    net.failedCount += entries.length
    for (const [address, error] of entries) {
      if (net.failedAddresses.length >= MAX_FAILED_ADDRESSES_STORED) break
      net.failedAddresses.push({ address, error: shortError(error) })
    }
    this.scheduleFlush()
  }

  finishNetwork (networkSlug: string): void {
    const net = this.state.networks[networkSlug]
    if (net === undefined) return
    net.finishedAt = Date.now()
    this.scheduleFlush()
  }

  async finish (status: 'completed' | 'failed', error?: string): Promise<void> {
    const now = Date.now()
    if (status === 'failed') this.state.failedPhase = this.state.currentPhase
    this.closeCurrentPhase(now)
    this.state.status = status
    this.state.finishedAt = now
    if (error !== undefined) this.state.error = shortError(error)
    if (this.heartbeat !== undefined) clearInterval(this.heartbeat)
    this.heartbeat = undefined
    await this.flush()
  }

  private closeCurrentPhase (now: number): void {
    const current = this.state.currentPhase
    if (current === undefined) return
    const timing = this.state.phases[current]
    if (timing !== undefined && timing.finishedAt === undefined) timing.finishedAt = now
    this.state.currentPhase = undefined
  }

  private scheduleFlush (): void {
    if (this.flushTimer !== undefined) return
    this.flushTimer = setTimeout(() => { void this.flush() }, FLUSH_THROTTLE_MS)
    this.flushTimer.unref?.()
  }

  private async flush (): Promise<void> {
    if (this.flushTimer !== undefined) {
      clearTimeout(this.flushTimer)
      this.flushTimer = undefined
    }
    this.state.updatedAt = Date.now()
    try {
      await redis.set(SYNC_PROGRESS_KEY, JSON.stringify(this.state))
    } catch (err: any) {
      // Progress reporting must never break the sync itself.
      console.error(`[SYNC PROGRESS]: failed to write progress: ${err.message as string}`)
    }
  }
}

export async function getSyncJobProgress (): Promise<SyncJobProgress | null> {
  const raw = await redis.get(SYNC_PROGRESS_KEY)
  if (raw === null || raw === undefined) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
