import React, { useEffect, useState, useMemo } from 'react'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import TableContainer from '../../components/TableContainer/TableContainer'
import { ButtonDisplayData } from 'redis/types'
import Image from 'next/image'
import Link from 'next/link'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import EyeIcon from 'assets/eye-icon.png'
import { formatQuoteValue, compareNumericString, removeUnserializableFields } from 'utils/index'
import { XEC_NETWORK_ID, BCH_TX_EXPLORER_URL, XEC_TX_EXPLORER_URL } from 'constants/index'
import moment from 'moment'
import TopBar from 'components/TopBar'
import { fetchUserWithSupertokens, UserWithSupertokens } from 'services/userService'

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
      user
    }
  }
}

interface PaybuttonsProps {
  user: UserWithSupertokens
}

export default function Payments ({ user }: PaybuttonsProps): React.ReactElement {
  const [data, setData] = useState([])

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      const response = await fetch('api/payments')
      const payments = await response.json()
      setData(payments)
    }
    fetchData().catch(console.error)
  }, [])

  const columns = useMemo(
    () => [
      {
        Header: 'Date',
        accessor: 'timestamp',
        Cell: (cellProps) => {
          return <div className='table-date'>{moment(cellProps.cell.value * 1000).format('lll')}</div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'right' }}>Amount</div>),
        accessor: 'values',
        sortType: compareNumericString,
        Cell: (cellProps) => {
          return <div style={{ textAlign: 'right', fontWeight: '600' }}>${formatQuoteValue(cellProps.cell.value, user.userProfile.preferredCurrencyId)}</div>
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
            <div className='payments-btn-cell'> {cellProps.cell.value.map((buttonDisplayData: ButtonDisplayData) =>
              <div style={{ textAlign: 'center' }} className="table-button" key={buttonDisplayData.id}>
              <Link href={`/button/${buttonDisplayData.id}`}>{buttonDisplayData.name}</Link>
              </div>
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

  return (
    <>
      <TopBar title="Payments" user={user.stUser?.email} />
      {data.length === 0 ? <div className='no-payments'>No Payments to show yet</div> : <TableContainer columns={columns} data={data} />}
    </>
  )
}
