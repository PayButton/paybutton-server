import React, { useEffect, useState } from 'react'
import ThirdPartyEmailPasswordNode from 'supertokens-node/recipe/thirdpartyemailpassword'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import Page from 'components/Page'
import style from './admin.module.css'
import { isUserAdmin, UserWithSupertokens } from 'services/userService'
import { useRouter } from 'next/router'
import { SubbedAddressesLog } from 'services/chronikService'
import RegisteredUsers from 'components/Admin/RegisteredUsers'

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
  const [subbedAddresses, setSubbedAddresses] = useState<SubbedAddressesLog>()
  const [users, setUsers] = useState<UserWithSupertokens[]>([])

  useEffect(() => {
    if (user === null || !isAdmin) {
      void router.push('/dashboard')
    }
  }, [user, isAdmin])

  useEffect(() => {
    void (async () => {
      const ok = await (await fetch('chronikStatus')).json()
      setSubbedAddresses(ok)
      const ok2 = await (await fetch('users')).json()
      setUsers(ok2)
    })()
  }, [])

  if (user !== null && isAdmin) {
    return <>
      <h2> Admin Dashboard</h2>
      <br/>
      <div className={style.admin_ctn}>
        <button className={style.button}>
          <a target="_blank" href='/api/auth/dashboard'>Supertokens Admin Dashboard</a>
        </button>
        <h3>Chronik Status</h3>
        <h4>Subscribed addresses</h4>
        <ol>
        { subbedAddresses?.registeredSubscriptions?.map(s => <li key={s}>{s}</li>) }
        </ol>
        { subbedAddresses?.different === true && <>
          <p className={style.warning_message}> Warning! The subscribed addresses registered since the beginning of the last deploy (list above) is different than the addresses being read by the chronik object instance (list below).</p>
          <ol>
            { subbedAddresses?.currentSubscriptions?.map(s => <li key={s}>{s}</li>) }
          </ol>
        </>
        }
        <h4>Registered Users</h4>
        <RegisteredUsers users={users}/>
      </div>
    </>
  } else {
    return <Page/>
  }
}
