import React, { useEffect, useState } from 'react'
import ThirdPartyEmailPasswordNode from 'supertokens-node/recipe/thirdpartyemailpassword'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import Page from 'components/Page'
import style from './admin.module.css'
import { isUserAdmin } from 'services/userService'
import { useRouter } from 'next/router'
import { SubbedAddressesLog } from 'services/chronikService'

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

  useEffect(() => {
    if (user === null || !isAdmin) {
      void router.push('/dashboard')
    }
  }, [user, isAdmin])

  useEffect(() => {
    void (async () => {
      const ok = await (await fetch('chronikStatus')).json()
      setSubbedAddresses(ok)
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
        <h4>Registered Subscriptions</h4>
        <ol>
        { subbedAddresses?.registeredSubscriptions?.map(s => <li>{s}</li>) }
        </ol>
        <h4>In-memory Subscriptions</h4>
        <ol>
        { subbedAddresses?.registeredSubscriptions?.map(s => <li>{s}</li>) }
        </ol>
      </div>
    </>
  } else {
    return <Page/>
  }
}
