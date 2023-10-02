import React from 'react'
import ThirdPartyEmailPasswordNode from 'supertokens-node/recipe/thirdpartyemailpassword'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import Page from 'components/Page'
import style from './admin.module.css'
import { isUserAdmin } from 'services/userService'

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
  if (user !== null && isAdmin) {
    return (
      <div className={style.account_ctn}>
        <a href='/api/auth/dashboard'>Supertokens Admin Dashboard</a>
      </div>
    )
  }
  return <Page />
}
