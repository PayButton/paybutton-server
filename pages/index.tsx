import React from 'react'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import Page from 'components/Page'
import { PayButton } from 'types'

const ThirdPartyEmailPasswordAuthNoSSR = dynamic(
  new Promise((res) =>
    res(ThirdPartyEmailPassword.ThirdPartyEmailPasswordAuth)
  ),
  { ssr: false }
)

export async function getServerSideProps(context) {
  // this runs on the backend, so we must call init on supertokens-node SDK
  supertokensNode.init(SuperTokensConfig.backendConfig())
  let session
  try {
    session = await Session.getSession(context.req, context.res)
  } catch (err) {
    if (err.type === Session.Error.TRY_REFRESH_TOKEN) {
      return { props: { fromSupertokens: 'needs-refresh' } }
    } else if (err.type === Session.Error.UNAUTHORISED) {
      return { props: {} }
    } else {
      throw err
    }
  }

  return {
    props: { userId: session.getUserId() },
  }
}

export default function Home(props) {
  return (
    <ThirdPartyEmailPasswordAuthNoSSR>
      <ProtectedPage userId={props.userId} />
    </ThirdPartyEmailPasswordAuthNoSSR>
  )
}

function ProtectedPage({ userId }) {
  const [payButtons, setPayButtons] = React.useState([])

  async function handleLogout() {
    await ThirdPartyEmailPassword.signOut()
    ThirdPartyEmailPassword.redirectToAuth()
  }

  async function fetchPayButtons() {
    const res = await fetch(`/api/button/${userId}`)
    if (res.status === 200) {
      const json = await res.json()
      console.log('Fetched PayButtons: ', json)
      return json
    }
  }

  async function handleSubmit(values) {
    const res = await fetch('/api/paybutton', {
      method: 'POST',
      body: JSON.stringify({ 
      userId: userId,
      addresses: values.addresses
      })
    })
    if (res.status === 200) {
      const json = await res.json()
      setPayButtons([...payButtons, json])
    }
  }

  return (
    <Page header={<a href="#" onClick={handleLogout}>Logout</a>}>
      PayButton Logged In
    </Page>
  )
}
