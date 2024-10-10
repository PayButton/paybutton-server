import React from 'react'
import { PaybuttonList, PaybuttonForm } from 'components/Paybutton'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { WalletWithAddressesWithPaybuttons } from 'services/walletService'
import { PaybuttonPOSTParameters } from 'utils/validators'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import TopBar from 'components/TopBar'
import { fetchUserWithSupertokens, UserWithSupertokens } from 'services/userService'
import { removeUnserializableFields } from 'utils/index'

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
  const userId = session.getUserId()
  const user = await fetchUserWithSupertokens(userId)
  removeUnserializableFields(user.userProfile)

  return {
    props: {
      user
    }
  }
}

interface PaybuttonsProps {
  user: UserWithSupertokens
}

interface PaybuttonsState {
  paybuttons: PaybuttonWithAddresses[]
  wallets: WalletWithAddressesWithPaybuttons[]
  error: String
}

export default class Buttons extends React.Component<PaybuttonsProps, PaybuttonsState> {
  constructor (props: PaybuttonsProps) {
    super(props)
    this.props = props
    this.state = { paybuttons: [], wallets: [], error: '' }
  }

  async componentDidMount (): Promise<void> {
    await this.fetchPaybuttons()
    await this.fetchWallets()
  }

  async fetchPaybuttons (): Promise<void> {
    const res = await fetch(`/api/paybuttons?userId=${this.props.user.userProfile.id}`, {
      method: 'GET'
    })
    if (res.status === 200) {
      this.setState({
        paybuttons: await res.json()
      })
    }
  }

  async fetchWallets (): Promise<void> {
    const res = await fetch(`/api/wallets?userId=${this.props.user.userProfile.id}`, {
      method: 'GET'
    })
    if (res.status === 200) {
      this.setState({
        wallets: (await res.json()).map(walletWithPaymentInfo => walletWithPaymentInfo.wallet)
      })
    }
  }

  async onSubmit (values: PaybuttonPOSTParameters): Promise<void> {
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
      this.setState({
        error: ''
      })
    } else {
      const json = await res.json()
      this.setState({
        error: json.message
      })
      setTimeout(() => {
        this.setState({
          error: ''
        })
      }, 2500)
    }
  }

  render (): React.ReactElement {
    return (
      <>
        <TopBar title="Buttons" user={this.props.user.stUser?.email} />
        <PaybuttonList paybuttons={this.state.paybuttons} />
        <PaybuttonForm onSubmit={this.onSubmit.bind(this)} paybuttons={this.state.paybuttons} wallets={this.state.wallets} error={this.state.error} />
      </>
    )
  }
}
