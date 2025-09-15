import React, { useEffect, useState } from 'react'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import { GetServerSideProps } from 'next'
import Page from 'components/Page'
import style from './admin.module.css'
import { fetchUserWithSupertokens, isUserAdmin, UserWithSupertokens } from 'services/userService'
import { useRouter } from 'next/router'
import RegisteredUsers from 'components/Admin/RegisteredUsers'
import { removeUnserializableFields } from 'utils'
import { multiBlockchainClient } from 'services/chronikService'
import { MainNetworkSlugsType } from 'constants/index'
import SubscribedAddresses from 'components/Admin/SubscribedAddresses'
import ChronikURLs from 'components/Admin/ChronikURLs'
import { frontEndGetSession } from 'utils/setSession'

export const getServerSideProps: GetServerSideProps = async (context) => {
  // this runs on the backend, so we must call init on supertokens-node SDK
  supertokensNode.init(SuperTokensConfig.backendConfig())
  const sessionResult = await frontEndGetSession(context)
  if (!sessionResult.success) {
    return sessionResult.failedResult.payload
  }
  const session = sessionResult.session
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

export default function Admin ({ user, isAdmin, chronikUrls }: IProps): JSX.Element {
  const router = useRouter()
  const [users, setUsers] = useState<UserWithSupertokens[]>([])

  useEffect(() => {
    if (user === null || !isAdmin) {
      void router.push('/dashboard')
    }
  }, [user, isAdmin])

  useEffect(() => {
    void (async () => {
      const usersJSON = await (await fetch('/api/users')).json()
      setUsers(usersJSON)
    })()
  }, [])

  if (user !== null && isAdmin) {
    return <>
      <div className={style.admin_ctn}>
        <h2>Admin Dashboard</h2>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="/api/auth/dashboard"
          className={`${style.admin_button} button_main button_small`}
        >
          Go to Supertokens Admin Dashboard
        </a>
      </div>
      <ChronikURLs chronikUrls={chronikUrls}/>
      <hr className={style.divisor}/>
      <SubscribedAddresses/>
      <hr className={style.divisor}/>
      <RegisteredUsers users={users}/>
    </>
  } else {
    return <Page/>
  }
}
