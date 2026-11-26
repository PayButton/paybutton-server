import { useEffect, useState } from 'react'
import type { SyncStatus as SyncStatusData } from 'services/syncStatusService'
import type { NetworkSyncProgress, SyncPhase } from 'redis/syncProgress'
import style from './admin.module.css'

const POLL_INTERVAL_MS = 5000
// The job refreshes its progress at least every 30s while running.
const JOB_STALLED_AFTER_MS = 90 * 1000

const NETWORK_TITLES: Record<string, string> = {
  ecash: 'eCash',
  bitcoincash: 'Bitcoin Cash'
}

const PHASES: Array<{ key: SyncPhase, title: string }> = [
  { key: 'prices', title: 'Past prices' },
  { key: 'transactions', title: 'Transactions' },
  { key: 'priceLinking', title: 'Price linking' },
  { key: 'cacheInvalidation', title: 'Cache invalidation' }
]

const formatDuration = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

const formatTime = (ts: number): string => new Date(ts).toLocaleString()

const percent = (done: number, total: number): number =>
  total === 0 ? 100 : Math.min(100, Math.round((done / total) * 100))

function ProgressBar ({ done, total }: { done: number, total: number }): JSX.Element {
  const pct = percent(done, total)
  return (
    <div className={style.progress} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={style.progress_fill} style={{ width: `${pct}%` }} />
      <span className={style.progress_label}>{done.toLocaleString()} / {total.toLocaleString()} ({pct}%)</span>
    </div>
  )
}

function JobNetwork ({ slug, net, now }: { slug: string, net: NetworkSyncProgress, now: number }): JSX.Element {
  const end = net.finishedAt ?? now
  return (
    <div>
      <h5>{NETWORK_TITLES[slug] ?? slug}</h5>
      <ProgressBar done={net.addressesDone} total={net.totalAddresses} />
      <div className={style.sync_meta}>
        {net.txsCommitted.toLocaleString()} txs committed · {formatDuration(end - net.startedAt)}
        {net.finishedAt === undefined ? ' (running)' : ''}
        {net.failedCount > 0 && <span className={style.sync_error}> · {net.failedCount} failed</span>}
      </div>
    </div>
  )
}

export default function SyncStatus (): JSX.Element {
  const [data, setData] = useState<SyncStatusData | undefined>()
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/admin/syncStatus')
        // A proxy timeout or crash returns an HTML error page, not JSON.
        const text = await res.text()
        if (cancelled) return
        let json: any
        try {
          json = JSON.parse(text)
        } catch {
          throw new Error(`HTTP ${res.status} ${res.statusText} (non-JSON response)`)
        }
        if (!res.ok) throw new Error(json.message ?? `HTTP ${res.status}`)
        setData(json)
        setError(undefined)
      } catch (err: any) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) timer = setTimeout(() => { void load() }, POLL_INTERVAL_MS)
      }
    }
    void load()
    return () => {
      cancelled = true
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [])

  if (data === undefined) {
    return <>
      <h3>Sync Status</h3>
      <p>{error !== undefined ? `Failed to load sync status: ${error}` : 'Loading…'}</p>
    </>
  }

  const now = data.serverTime
  const job = data.job
  const stalled = job?.status === 'running' && now - job.updatedAt > JOB_STALLED_AFTER_MS
  const failedAddresses = job === null
    ? []
    : Object.entries(job.networks).flatMap(([slug, n]) => n.failedAddresses.map(f => ({ ...f, slug })))

  let jobStatusLabel = 'No run recorded'
  let jobStatusClass = ''
  if (job !== null) {
    if (stalled) {
      jobStatusLabel = `Stalled (no update for ${formatDuration(now - job.updatedAt)}; jobs process may have died)`
      jobStatusClass = style.sync_error
    } else if (job.status === 'running') {
      jobStatusLabel = 'Running'
      jobStatusClass = style.sync_running
    } else if (job.status === 'completed') {
      jobStatusLabel = 'Completed'
      jobStatusClass = style.sync_ok
    } else {
      jobStatusLabel = 'Failed'
      jobStatusClass = style.sync_error
    }
  }

  return <>
    <h3>Sync Status</h3>
    {error !== undefined && <p className={style.sync_error}>Last refresh failed: {error}</p>}

    <div className="paybutton-table-ctn">
      <h4>Background sync job</h4>
      <p>
        Status: <strong className={jobStatusClass}>{jobStatusLabel}</strong>
        {job !== null && <>
          {' · '}started {formatTime(job.startedAt)}
          {' · '}{job.finishedAt !== undefined ? `took ${formatDuration(job.finishedAt - job.startedAt)}` : `elapsed ${formatDuration(now - job.startedAt)}`}
        </>}
      </p>
      {job?.error !== undefined && <p className={style.sync_error}>
        Error{job.failedPhase !== undefined ? ` during ${PHASES.find(p => p.key === job.failedPhase)?.title ?? job.failedPhase}` : ''}: {job.error}
      </p>}
      {job !== null && <ol className={style.phases}>
        {PHASES.map(({ key, title }) => {
          const t = job.phases[key]
          const active = job.currentPhase === key
          const failed = job.failedPhase === key
          let detail = 'pending'
          if (t !== undefined) {
            detail = t.finishedAt !== undefined
              ? `done in ${formatDuration(t.finishedAt - t.startedAt)}`
              : `running for ${formatDuration(now - t.startedAt)}`
          }
          if (failed) detail = 'failed'
          return <li key={key} className={active ? style.phase_active : failed ? style.sync_error : t?.finishedAt !== undefined ? style.phase_done : style.phase_pending}>
            {title}: {detail}
          </li>
        })}
      </ol>}
      {job !== null && Object.keys(job.networks).length > 0 && <div className="columns">
        {Object.entries(job.networks).map(([slug, net]) => <JobNetwork key={slug} slug={slug} net={net} now={now} />)}
      </div>}
    </div>

    <div className="paybutton-table-ctn">
      <h4>Addresses (all syncs, including on-demand)</h4>
      <div className="columns">
        {Object.entries(data.networks).map(([slug, n]) => (
          <div key={slug}>
            <h5>{NETWORK_TITLES[slug] ?? slug}</h5>
            <ProgressBar done={n.total - n.syncing} total={n.total} />
            <div className={style.sync_meta}>
              {n.syncing.toLocaleString()} syncing
              {n.stuck > 0 && <span className={style.sync_error}> ({n.stuck.toLocaleString()} stuck)</span>}
              {' · '}{n.withoutTxs.toLocaleString()} with no txs yet
            </div>
          </div>
        ))}
      </div>
      <p className={style.sync_meta}>
        Transactions without linked prices:{' '}
        {data.unpricedTxs === null || data.unpricedTxsCheckedAt === null
          ? <em>counting…</em>
          : <><strong>{data.unpricedTxs.toLocaleString()}</strong> (counted {formatDuration(now - data.unpricedTxsCheckedAt)} ago)</>}
      </p>
    </div>

    {data.syncingAddresses.length > 0 && <div className="paybutton-table-ctn">
      <h4>Currently syncing addresses (oldest first)</h4>
      <table>
        <thead><tr><th>Address</th><th>Network</th><th>Syncing since</th></tr></thead>
        <tbody>
          {data.syncingAddresses.map(a => (
            <tr key={a.address} className={a.stuck ? style.sync_error : ''}>
              <td className={style.address_cell}>{a.address}</td>
              <td>{NETWORK_TITLES[a.network] ?? a.network}</td>
              <td>{formatDuration(now - a.since)} ago{a.stuck ? ' (stuck?)' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>}

    {failedAddresses.length > 0 && <div className="paybutton-table-ctn">
      <h4>Failed addresses in last job run</h4>
      <table>
        <thead><tr><th>Address</th><th>Network</th><th>Error</th></tr></thead>
        <tbody>
          {failedAddresses.map(f => (
            <tr key={`${f.slug}:${f.address}`}>
              <td className={style.address_cell}>{f.address}</td>
              <td>{NETWORK_TITLES[f.slug] ?? f.slug}</td>
              <td className={style.sync_error}>{f.error}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>}
  </>
}
