import React from 'react'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import Page from 'components/Page'
import { PaybuttonList, PaybuttonForm } from 'components/Paybutton'
import { Paybutton } from '@prisma/client'
import { POSTParameters } from 'utils/validators'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'

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

interface PaybuttonsState {
  paybuttons: Paybutton[]
}

export default function Home ({ userId }: PaybuttonsProps): React.ReactElement {
  return (
    <ThirdPartyEmailPasswordAuthNoSSR>
      <ProtectedPage userId={userId} />
    </ThirdPartyEmailPasswordAuthNoSSR>
  )
}

class ProtectedPage extends React.Component<PaybuttonsProps, PaybuttonsState> {
  constructor (props: PaybuttonsProps) {
    super(props)
    this.props = props
    this.state = { paybuttons: [] }
  }

  async componentDidMount (): Promise<void> {
    await this.fetchPaybuttons()
  }

  async fetchPaybuttons (): Promise<void> {
    const res = await fetch(`/api/paybuttons?userId=${this.props.userId}`, {
      method: 'GET'
    })
    if (res.status === 200) {
      this.setState({
        paybuttons: await res.json()
      })
    }
  }

  async handleLogout (): Promise<void> {
    await ThirdPartyEmailPassword.signOut()
    void ThirdPartyEmailPassword.redirectToAuth()
  }

  async onSubmit (values: POSTParameters): Promise<void> {
    const res = await fetch('/api/paybutton', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(values)
    })
    if (res.status === 200) {
      const json = await res.json()
      this.setState({
        paybuttons: [...this.state.paybuttons, json]
      })
    }
  }

  render (): React.ReactElement {
    return (
      <Page header={<a href='#' onClick={this.handleLogout}>Logout</a>}>
        <h2> Create PayButton:</h2>
        <PaybuttonForm onSubmit={this.onSubmit.bind(this)} />
        <h2>PayButtons:</h2>
        <PaybuttonList paybuttons={this.state.paybuttons} />
      </Page>
    )
  }
}
