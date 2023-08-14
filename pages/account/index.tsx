import React from 'react'
import ThirdPartyEmailPasswordNode from 'supertokens-node/recipe/thirdpartyemailpassword'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import Page from 'components/Page'
import ChangePassword from 'components/Account/ChangePassword'

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

  return {
    props: {
      userId,
      user: await ThirdPartyEmailPasswordNode.getUserById(userId)
    }
  }
}

interface IProps {
  userId: string
  user: ThirdPartyEmailPasswordNode.User | undefined
}

export default function Account ({ user, userId }: IProps): React.ReactElement {
  if (user !== null) {
    return (
      <>
        <h2>Account</h2>
        <p>E-mail: {user.email}</p>
        <ChangePassword/>
      </>
    )
  }
  return <Page/>
}
