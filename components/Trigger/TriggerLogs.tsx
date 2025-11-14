import React, { useMemo, useState } from 'react'
import moment from 'moment-timezone'
import TableContainer, { DataGetterReturn } from 'components/TableContainer/TableContainerGetter'
import style from './trigger.module.css'

type ActionType = 'PostData' | 'SendEmail'

interface TriggerLogRow {
  id: number
  createdAt: string
  updatedAt: string
  isError: boolean
  actionType: ActionType
  sentData?: string
  email?: string
  response: string
}

interface IProps {
  paybuttonId: string
  tableRefreshCount?: number
  timezone?: string
  ssr?: boolean
  emptyMessage?: string
}

/* ---------- helpers ---------- */
const pretty = (val: unknown): string => {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return val
    }
  }
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val, null, 2)
    } catch {
      return String(val)
    }
  }
  return String(val)
}

const toEmailRow = (row: Record<string, unknown>): TriggerLogRow => {
  try {
    const d = JSON.parse(String(row.data ?? '{}')) as Record<string, unknown>
    const email: string =
      typeof d.email === 'string'
        ? d.email
        : typeof d.triggerEmail === 'string'
          ? d.triggerEmail
          : '-'

    if (row.isError === true) {
      const msg =
        typeof d.errorMessage === 'string' ? d.errorMessage : 'Error'
      const name =
        typeof d.errorName === 'string' && d.errorName.length > 0
          ? `${d.errorName}: `
          : ''
      return {
        ...(row as unknown as TriggerLogRow),
        email,
        sentData: '-',
        response: `${name}${msg}`
      }
    }

    return {
      ...(row as unknown as TriggerLogRow),
      email,
      sentData: '-',
      response: '-'
    }
  } catch {
    return {
      ...(row as unknown as TriggerLogRow),
      sentData: '-',
      email: '-',
      response: String(row.data ?? '-')
    }
  }
}

const toPostRow = (row: Record<string, unknown>): TriggerLogRow => {
  try {
    const d = JSON.parse(String(row.data ?? '{}')) as Record<string, unknown>
    const sent =
      Boolean(row.isError) && 'triggerPostData' in d
        ? d.triggerPostData
        : d.postedData
    const sentStr = pretty(sent)

    if (row.isError === true) {
      const msg =
        typeof d.errorMessage === 'string' ? d.errorMessage : 'Error'
      const name =
        typeof d.errorName === 'string' && d.errorName.length > 0
          ? `${d.errorName}: `
          : ''
      return {
        ...(row as unknown as TriggerLogRow),
        sentData: sentStr,
        response: `${name}${msg}`
      }
    }

    return {
      ...(row as unknown as TriggerLogRow),
      sentData: sentStr,
      response: pretty(d.responseData)
    }
  } catch {
    return {
      ...(row as unknown as TriggerLogRow),
      sentData: '-',
      response: String(row.data ?? '-')
    }
  }
}

/* -------------------------------- component ------------------------------- */
const TriggerLogs = ({
  paybuttonId,
  tableRefreshCount = 0,
  timezone,
  ssr = false,
  emptyMessage
}: IProps): JSX.Element => {
  const [activeTab, setActiveTab] = useState<ActionType>('PostData')
  const tz = timezone?.trim() !== '' ? timezone : moment.tz.guess()

  const timeCol = {
    Header: 'Time',
    id: 'createdAt',
    accessor: 'createdAt',
    Cell: ({ value }: { value: string }) => moment.tz(value, tz).format('ll LT')
  }

  const statusCol = {
    Header: 'Status',
    id: 'isError',
    accessor: 'isError',
    Cell: ({ value }: { value: boolean }) => (
      <span className={value ? style.errorText : style.successText}>
        {value ? 'Error' : 'Success'}
      </span>
    )
  }

  const responseCol = {
    Header: 'Response',
    id: 'response',
    accessor: 'response',
    Cell: ({ value }: { value: string }) =>
      value === '-'
        ? (
        <span className={style.naText}>N/A</span>
          )
        : (
        <pre title={value} className={style.codeBlock}>
          {value}
        </pre>
          )
  }

  const postColumns = useMemo(
    () => [
      timeCol,
      statusCol,
      {
        Header: 'Sent Data',
        id: 'sentData',
        accessor: 'sentData',
        Cell: ({ value }: { value: string }) =>
          value === '-'
            ? (
            <span className={style.naText}>N/A</span>
              )
            : (
            <pre title={value} className={style.codeBlock}>
              {value}
            </pre>
              )
      },
      responseCol
    ],
    [tz]
  )

  const emailColumns = useMemo(
    () => [
      timeCol,
      statusCol,
      {
        Header: 'Email',
        id: 'email',
        accessor: 'email',
        Cell: ({ value }: { value: string }) => <span>{value}</span>
      },
      {
        ...responseCol,
        Header: 'Error'
      }
    ],
    [tz]
  )

  const dataGetter = async (
    page: number,
    pageSize: number,
    orderBy: string,
    orderDesc: boolean
  ): Promise<DataGetterReturn> => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      orderBy,
      orderDesc: String(orderDesc),
      actionType: activeTab
    })
    const res = await fetch(
      `/api/paybutton/triggers/logs/${paybuttonId}?${params.toString()}`,
      { method: 'GET' }
    )
    if (!res.ok) return { data: [], totalCount: 0 }

    const json = (await res.json()) as { data: any[], totalCount: number }

    const shaped =
      activeTab === 'PostData'
        ? json.data.map((r) => toPostRow(r))
        : json.data.map((r) => toEmailRow(r))

    return { data: shaped, totalCount: json.totalCount }
  }

  return (
    <div className={style.wrapper}>
      <div className={style.tabBar}>
        <div
          role="tab"
          tabIndex={0}
          onClick={() => setActiveTab('PostData')}
          className={`${style.tab} ${activeTab === 'PostData' ? style.tabActive : ''}`}
        >
          Requests
        </div>
        <div
          role="tab"
          tabIndex={0}
          onClick={() => setActiveTab('SendEmail')}
          className={`${style.tab} ${activeTab === 'SendEmail' ? style.tabActive : ''}`}
        >
          Emails
        </div>
      </div>

      <TableContainer
        key={activeTab}
        ssr={ssr}
        columns={activeTab === 'PostData' ? postColumns : emailColumns}
        dataGetter={dataGetter}
        opts={{ sortColumn: 'createdAt' }}
        tableRefreshCount={tableRefreshCount}
        emptyMessage={emptyMessage ?? 'No logs found for this trigger type.'}
      />
    </div>
  )
}

export default TriggerLogs
