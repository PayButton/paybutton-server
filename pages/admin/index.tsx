import React, { useEffect, useState, useMemo } from 'react'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import Page from 'components/Page'
import style from './admin.module.css'
import { fetchUserWithSupertokens, isUserAdmin, UserWithSupertokens } from 'services/userService'
import { useRouter } from 'next/router'
import RegisteredUsers from 'components/Admin/RegisteredUsers'
import TableContainer from '../../components/TableContainer/TableContainer'
import EyeIcon from 'assets/eye-icon.png'
import Image from 'next/image'
import { removeUnserializableFields } from 'utils'
import { multiBlockchainClient } from 'services/chronikService'
import { MainNetworkSlugsType } from 'constants/index'

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
  const user = await fetchUserWithSupertokens(userId)
  removeUnserializableFields(user.userProfile)
  const chronikUrls = multiBlockchainClient.getUrls()

  const isAdmin = await isUserAdmin(userId)
  return {
    props: {
      userId,
      user,
      isAdmin,
      chronikUrls
    }
  }
}

interface IProps {
  userId: string
  isAdmin: boolean
  user: supertokensNode.User | undefined
  chronikUrls: Record<MainNetworkSlugsType, string[]>

}

export default function Admin ({ user, isAdmin }: IProps): JSX.Element {
  const router = useRouter()
  const [ecashSubscribedAddresses, setEcashSubscribedAddresses] = useState<string[]>([])
  const [bitcoincashSubscribedAddresses, setBitcoincashSubscribedAddresses] = useState<string[]>([])
  const [users, setUsers] = useState<UserWithSupertokens[]>([])

  useEffect(() => {
    if (user === null || !isAdmin) {
      void router.push('/dashboard')
    }
  }, [user, isAdmin])

  useEffect(() => {
    void (async () => {
      const ok = await (await fetch('chronikStatus')).json()
      const subscribedEcashAddresses = ok.ecash?.map((value: string) => ({ address: value }))
      const subscribedBitcoincashAddresses = ok.bitcoincash?.map((value: string) => ({ address: value }))
      setEcashSubscribedAddresses(subscribedEcashAddresses)
      setBitcoincashSubscribedAddresses(subscribedBitcoincashAddresses)
      const ok2 = await (await fetch('/api/users')).json()
      setUsers(ok2)
    })()
  }, [])

  const columns = useMemo(
    () => [
      {
        Header: 'Subscribed addresses',
        accessor: 'address',
        Cell: (cellProps: any) => {
          return <div className="table-date">{cellProps.cell.value}</div>
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
        </a>
        }
      }
    ],
    []
  )

  if (user !== null && isAdmin) {
    return <>
      <h2>Admin Dashboard</h2>
      <div className={style.admin_ctn}>
        <h3> eCash</h3>
      <TableContainer columns={columns} data={ecashSubscribedAddresses ?? []} ssr/>
        <h3> Bitcoin Cash</h3>
      <TableContainer columns={columns} data={bitcoincashSubscribedAddresses ?? []} ssr/>
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
