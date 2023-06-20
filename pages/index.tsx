import React from 'react'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import dynamic from 'next/dynamic'
import { GetServerSideProps } from 'next'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import Dashboard from 'pages/dashboard'

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
    console.log('tentando session')
    session = await Session.getSession(context.req, context.res)
    console.log('sucesso session')
  } catch (err: any) {
    if (err.type === Session.Error.TRY_REFRESH_TOKEN) {
      console.log('1')
      return { props: { fromSupertokens: 'needs-refresh' } }
    } else if (err.type === Session.Error.UNAUTHORISED) {
      console.log('2')
      return { props: {} }
    } else {
      console.log('3')
      throw err
    }
  }

  return {
    props: { userId: session.getUserId() }
  }
}

interface HomeProps {
  userId: string
}

function ProtectedPage (props: HomeProps): React.Component {
  console.log('pp')
  return (
    <Dashboard />
  )
}

export default function Home (props: HomeProps): React.Component {
  console.log('home')
  return (

    <ThirdPartyEmailPasswordAuthNoSSR>
      <ProtectedPage userId={props.userId} />
    </ThirdPartyEmailPasswordAuthNoSSR>

  )
}
