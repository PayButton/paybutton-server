import React, { useEffect, useState, useMemo } from 'react'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import TableContainer from './TableContainer'

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

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      const response = await fetch('https://randomuser.me/api/?results=100')
      const body = await response.json()
      const contacts = body.results
      console.log(contacts)
      setData(contacts)
    }
    fetchData().catch(console.error)
  }, [])

  const columns = useMemo(
    () => [
      {
        Header: 'Title',
        accessor: 'name.title'
      },
      {
        Header: 'First Name',
        accessor: 'name.first'
      },
      {
        Header: 'Last Name',
        accessor: 'name.last'
      },
      {
        Header: 'Email',
        accessor: 'email'
      },
      {
        Header: 'City',
        accessor: 'location.city'
      },
      {
        Header: 'Hemisphere',
        accessor: 'location.color',
        disableSortBy: true,
        Cell: (cellProps) => {
          return <div>yoooo</div>
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
