import React, { useEffect, useState, useMemo } from 'react'
import ThirdPartyEmailPasswordNode from 'supertokens-node/recipe/thirdpartyemailpassword'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import Page from 'components/Page'
import style from './admin.module.css'
import { isUserAdmin, UserWithSupertokens } from 'services/userService'
import { useRouter } from 'next/router'
import RegisteredUsers from 'components/Admin/RegisteredUsers'
import TableContainer from '../../components/TableContainer';
import EyeIcon from 'assets/eye-icon.png'
import Image from 'next/image'

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
  const userId = session?.getUserId()
  const user = await ThirdPartyEmailPasswordNode.getUserById(userId)
  const isAdmin = await isUserAdmin(userId)
  return {
    props: {
      userId,
      user,
      isAdmin
    }
  }
}

interface IProps {
  userId: string
  isAdmin: boolean
  user: ThirdPartyEmailPasswordNode.User | undefined
}

export default function Admin ({ user, isAdmin }: IProps): JSX.Element {
  const router = useRouter()
  const [subbedAddresses, setSubbedAddresses] = useState([])
  const [currentAddresses, setCurrentAddresses] = useState([])
  const [different, setDifferent] = useState(false)
  const [users, setUsers] = useState<UserWithSupertokens[]>([])

  useEffect(() => {
    if (user === null || !isAdmin) {
      void router.push('/dashboard')
    }
  }, [user, isAdmin])

  useEffect(() => {
    void (async () => {
      const ok = await (await fetch('chronikStatus')).json()
      const subbedAddressesTableData = ok.registeredSubscriptions.map((value) => ({ address: value }))
      const currentAddressesTableData = ok.currentSubscriptions.map((value) => ({ address: value }))
      setSubbedAddresses(subbedAddressesTableData)
      setCurrentAddresses(currentAddressesTableData)
      setDifferent(ok?.different)
      const ok2 = await (await fetch('users')).json()
      setUsers(ok2)
    })()
  }, [])

  const columns = useMemo(
    () => [
      {
        Header: 'Subscribed addresses',
        accessor: 'address',
        Cell: (cellProps: any) => {
          return <div className="table-date">{cellProps.cell.value}</div>;
        }
      },
      {
        Header: 'View',
        accessor: 'view',
        Cell: (cellProps: any) => {
          return <a href={`https://explorer.e.cash/address/${cellProps.cell.row.values.address as string}`} target="_blank" rel="noopener noreferrer" className="table-eye-ctn">
          <div className="table-eye">
            <Image src={EyeIcon} alt='View on explorer' />
          </div>
        </a>;
        }
      }
    ],
    []
  );

  if (user !== null && isAdmin) {
    return <>
      <h2>Admin Dashboard</h2>
      <div className={style.admin_ctn}>
      <TableContainer columns={columns} data={subbedAddresses} ssr/>
        { different && <>
          <p className={style.warning_message}> Warning!<br />The subscribed addresses registered since the beginning of the last deploy (list above) is different than the addresses being read by the chronik object instance (list below).</p>
           <TableContainer columns={columns} data={currentAddresses} />
        </>
        }
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="/api/auth/dashboard"
          className={`${style.admin_button} button_main button_small`}
        >
          Go to Supertokens Admin Dashboard
        </a>
        <h4>Registered Users</h4>
        <RegisteredUsers users={users}/>
      </div>
    </>
  } else {
    return <Page/>
  }
}
