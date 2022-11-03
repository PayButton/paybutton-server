import React, { useEffect, useState, useMemo } from 'react'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import TableContainer from '../../components/TableContainer'
import Image from 'next/image'
import Link from 'next/link'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import EyeIcon from 'assets/eye-icon.png'
import { FormatNumber } from 'utils/general'
import moment from 'moment'

const ThirdPartyEmailPasswordAuthNoSSR = dynamic(
  new Promise((resolve, reject) =>
    resolve(ThirdPartyEmailPassword.ThirdPartyEmailPasswordAuth)
  ),
  { ssr: false }
)

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

  return {
    props: { userId: session.getUserId() }
  }
}

interface PaybuttonsProps {
  userId: string
}

export default function Payments ({ userId }: PaybuttonsProps): React.ReactElement {
  const [data, setData] = useState([])
  const [buttons, setButtons] = useState([])

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      const response = await fetch('api/dashboard')
      const buttons = await fetch(`/api/paybuttons?userId=${userId}`)
      const buttonsbody = await buttons.json()
      console.log(buttonsbody.reduce((addr) => addr.name))
      const body = await response.json()
      const payments = body.alltransactions
      setData(payments)
      setButtons(buttonsbody)
    }
    fetchData().catch(console.error)
  }, [])

  const columns = useMemo(
    () => [
      {
        Header: 'Date',
        accessor: 'timestamp',
        Cell: (cellProps) => {
          return <div style={{ fontSize: '12px' }}>{moment(cellProps.cell.value * 1000).format('lll')}</div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'right' }}>Amount</div>),
        accessor: 'amount',
        Cell: (cellProps) => {
          return <div style={{ textAlign: 'right', fontWeight: '600' }}>${FormatNumber(cellProps.cell.value, 'dollars')}</div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'center' }}>Network</div>),
        accessor: 'network',
        Cell: (cellProps) => {
          return (
            <div className='table-icon-ctn'>
              <div className='table-icon'>
              {cellProps.cell.value === 'XEC' ? <Image src={XECIcon} alt='XEC' /> : <Image src={BCHIcon} alt='BCH' />}
              </div>
            </div>
          )
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'center' }}>Button</div>),
        accessor: 'addressId',
        Cell: (cellProps) => {
          console.log(cellProps.value)
          return (
            <div style={{ textAlign: 'center' }} className="table-button">
              <Link href={`/button/1`}>Button Name</Link>
            </div>

          )
        }
      },
      {
        Header: 'TX',
        accessor: 'hash',
        disableSortBy: true,
        Cell: (cellProps) => {
          const url = cellProps.cell.row.values.network === 'XEC' ? 'https://explorer.e.cash/tx/' : 'https://blockchair.com/bitcoin-cash/transaction/'
          return (
            <a href={url + cellProps.cell.value} target="_blank" rel="noopener noreferrer" className="table-eye-ctn">
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
    <ThirdPartyEmailPasswordAuthNoSSR>
      <h2>Payments</h2>
      <TableContainer columns={columns} data={data} />
    </ThirdPartyEmailPasswordAuthNoSSR>
  )
}
