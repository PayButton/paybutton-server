import React, { useEffect, useMemo, useState } from 'react'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import TableContainerGetter from '../../components/TableContainer/TableContainerGetter'
import { ButtonDisplayData } from 'redis/types'
import Image from 'next/image'
import Link from 'next/link'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import EyeIcon from 'assets/eye-icon.png'
import { formatQuoteValue, compareNumericString, removeUnserializableFields } from 'utils/index'
import { XEC_NETWORK_ID, BCH_TX_EXPLORER_URL, XEC_TX_EXPLORER_URL, NETWORK_TICKERS_FROM_ID } from 'constants/index'
import moment from 'moment-timezone'
import TopBar from 'components/TopBar'
import { fetchUserWithSupertokens, UserWithSupertokens } from 'services/userService'
import { UserProfile } from '@prisma/client'

export const getServerSideProps: GetServerSideProps = async (context) => {
  // this runs on the backend, so we must call init on supertokens-node SDK
  supertokensNode.init(SuperTokensConfig.backendConfig())
  let session
  try {
    session = await Session.getSession(context.req, context.res)
  } catch (err: any) {
    if (err.type === Session.Error.TRY_REFRESH_TOKEN) {
      return { props: { fromSupertokens: 'needs-refresh' } }
    } else if (err.type === Session.Error.UNAUTHORISED) {
      return { props: {} }
    } else {
      throw err
    }
  }

  if (session === undefined) return
  const userId = session.getUserId()
  const user = await fetchUserWithSupertokens(userId)
  removeUnserializableFields(user.userProfile)

  return {
    props: {
      user,
      userId
    }
  }
}

interface PaybuttonsProps {
  user: UserWithSupertokens
  userId: string
}

export default function Payments ({ user, userId }: PaybuttonsProps): React.ReactElement {
  const timezone = user?.userProfile.preferredTimezone === '' ? moment.tz.guess() : user?.userProfile?.preferredTimezone
  const [selectedCurrencyCSV, setSelectedCurrencyCSV] = useState<string>('')
  const [paybuttonNetworks, setPaybuttonNetworks] = useState<number[]>([])

  const fetchPaybuttons = async (): Promise<any> => {
    const res = await fetch(`/api/paybuttons?userId=${user?.userProfile.id}`, {
      method: 'GET'
    })
    if (res.status === 200) {
      return await res.json()
    }
  }
  const getDataAndSetUpCurrencyCSV = async (): Promise<void> => {
    const paybuttons = await fetchPaybuttons()
    const networkIds: number[] = []
    paybuttons.forEach((p: { addresses: any[] }) => {
      return p.addresses.forEach((c: { address: { networkId: number } }) => networkIds.push(c.address.networkId))
    })

    setPaybuttonNetworks(networkIds)
  }

  useEffect(() => {
    void getDataAndSetUpCurrencyCSV()
  }, [])

  function fetchData (): Function {
    return async (page: number, pageSize: number, orderBy: string, orderDesc: boolean) => {
      const paymentsResponse = await fetch(`/api/payments?page=${page}&pageSize=${pageSize}&orderBy=${orderBy}&orderDesc=${String(orderDesc)}`)
      const paymentsCountResponse = await fetch('/api/payments/count', {
        headers: {
          Timezone: timezone
        }
      })
      const totalCount = await paymentsCountResponse.json()
      const payments = await paymentsResponse.json()
      return {
        data: payments,
        totalCount
      }
    }
  }

  const columns = useMemo(
    () => [
      {
        Header: 'Date',
        accessor: 'timestamp',
        Cell: (cellProps) => {
          return <div className='table-date'>{moment(cellProps.cell.value * 1000).tz(timezone).format('lll')}</div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'right' }}>Amount</div>),
        accessor: 'values',
        sortType: compareNumericString,
        Cell: (cellProps) => {
          return <div style={{ textAlign: 'right', fontWeight: '600' }}> {cellProps.cell.value.amount} (${formatQuoteValue(cellProps.cell.value.values, user.userProfile.preferredCurrencyId)})</div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'center' }}>Network</div>),
        accessor: 'networkId',
        Cell: (cellProps) => {
          return (
            <div className='table-icon-ctn'>
              <div className='table-icon'>
              {cellProps.cell.value === XEC_NETWORK_ID ? <Image src={XECIcon} alt='XEC' /> : <Image src={BCHIcon} alt='BCH' />}
              </div>
            </div>
          )
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'center' }}>Buttons</div>),
        accessor: 'buttonDisplayDataList',
        Cell: (cellProps) => {
          return (
            <div className='payments-btn-cell'>
              {cellProps.cell.value.map((buttonDisplayData: ButtonDisplayData) =>
                buttonDisplayData.providerUserId === userId
                  ? (
                  <div style={{ textAlign: 'center' }} className="table-button" key={buttonDisplayData.id}>
                    <Link href={`/button/${buttonDisplayData.id}`}>{buttonDisplayData.name}</Link>
                  </div>
                    )
                  : null
              )}
            </div>
          )
        }
      },
      {
        Header: 'TX',
        accessor: 'hash',
        disableSortBy: true,
        Cell: (cellProps) => {
          const url = cellProps.cell.row.values.networkId === XEC_NETWORK_ID ? XEC_TX_EXPLORER_URL : BCH_TX_EXPLORER_URL
          return (
            <a href={url.concat(cellProps.cell.value)} target="_blank" rel="noopener noreferrer" className="table-eye-ctn">
              <div className="table-eye">
                <Image src={EyeIcon} alt='View on explorer' />
              </div>
            </a>
          )
        }
      }
    ],
    []
  )

  const downloadCSV = async (userId: string, userProfile: UserProfile, currency: string): Promise<void> => {
    try {
      const preferredCurrencyId = userProfile?.preferredCurrencyId ?? ''
      let url = `/api/payments/download/?currency=${preferredCurrencyId}`
      const isCurrencyEmptyOrUndefined = (value: string): boolean => (value === '' || value === undefined)

      if (!isCurrencyEmptyOrUndefined(currency)) {
        url += `&network=${currency}`
      }

      const response = await fetch(url, {
        headers: {
          Timezone: moment.tz.guess()
        }
      })

      if (!response.ok) {
        throw new Error('Failed to download CSV')
      }

      const fileName = `${isCurrencyEmptyOrUndefined(currency) ? 'all' : `${currency.toLowerCase()}`}-transactions`
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${fileName}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('An error occurred while downloading the CSV:', error)
    } finally {
      setSelectedCurrencyCSV('')
    }
  }

  const handleExport = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const currencyParam = event.target.value !== 'all' ? event.target.value : ''
    setSelectedCurrencyCSV(currencyParam)
    void downloadCSV(userId, user?.userProfile, currencyParam)
  }

  return (
    <>
      <TopBar title="Payments" user={user?.stUser?.email} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'right' }}>
      {new Set(paybuttonNetworks).size > 1
        ? (
              <select
                id='export-btn'
                value={selectedCurrencyCSV}
                onChange={handleExport}
                className="button_outline button_small"
                style={{ marginBottom: '0', cursor: 'pointer' }}
              >
                <option value='' disabled> Export as CSV</option>
                <option key="all" value="all">
                  All Currencies
                </option>
                {Object.entries(NETWORK_TICKERS_FROM_ID)
                  .filter(([id]) => paybuttonNetworks.includes(Number(id)))
                  .map(([id, ticker]) => (
                    <option key={id} value={ticker}>
                      {ticker.toUpperCase()}
                    </option>
                  ))}
              </select>
          )
        : (
              <div
                onClick={handleExport}
                className="button_outline button_small"
                style={{ marginBottom: '0', cursor: 'pointer' }}
              >
                Export as CSV
              </div>)}
      </div>
      <TableContainerGetter
        columns={columns}
        dataGetter={fetchData()}
        tableRefreshCount={1}
        emptyMessage='No Payments to show yet'
        />
    </>
  )
}
