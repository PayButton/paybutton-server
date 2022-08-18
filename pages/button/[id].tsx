import React from 'react'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import Page from 'components/Page'
import Link from 'next/link'
import { PaybuttonDetail } from 'components/Paybutton'
import { AddressTransactions } from 'components/Transaction'
import { Transaction, Paybutton } from '@prisma/client'
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
    props: {
      userId: session.getUserId(),
      paybuttonId: context.params.id
    }
  }
}

interface PaybuttonProps {
  paybuttonId: string
}

interface PaybuttonState {
  transactions: {
    [address: string]: Transaction
  }
  paybutton: Paybutton | undefined
}

export default function Home ({ paybuttonId }: PaybuttonProps): React.ReactElement {
  return (
    <ThirdPartyEmailPasswordAuthNoSSR>
      <ProtectedPage paybuttonId={paybuttonId} />
    </ThirdPartyEmailPasswordAuthNoSSR>
  )
}

class ProtectedPage extends React.Component<PaybuttonProps, PaybuttonState> {
  constructor (props: PaybuttonProps) {
    super(props)
    this.props = props
    this.state = {
      transactions: {},
      paybutton: undefined
    }
  }

  async componentDidMount (): Promise<void> {
    await this.fetchPaybutton()
    for (const connector of this.state.paybutton.addresses) {
      await this.fetchTransactions(connector.address.address)
    }
  }

  async fetchPaybutton (): Promise<void> {
    const res = await fetch(`/api/paybutton/${this.props.paybuttonId}`, {
      method: 'GET'
    })
    if (res.status === 200) {
      this.setState({
        paybutton: await res.json()
      })
    }
  }

  async fetchTransactions (address: string): Promise<void> {
    const res = await fetch(`/api/transactions/${address}`, {
      method: 'GET'
    })
    const ok = await res.json()
    if (res.status === 200) {
      const state = this.state
      state.transactions[address] = ok
      this.setState(state)
    }
  }

  async handleLogout (): Promise<void> {
    await ThirdPartyEmailPassword.signOut()
    void ThirdPartyEmailPassword.redirectToAuth()
  }

  render (): React.ReactElement {
    if (this.state.paybutton !== undefined && Object.keys(this.state.transactions).length !== 0) {
      return (
        <>
          <Link href='/buttons'>
            <a className='back_btn'>Back</a>
          </Link>
          <PaybuttonDetail paybutton={this.state.paybutton} />
          <h4>Transactions</h4>
          <AddressTransactions addressTransactions={this.state.transactions} />
        </>
      )
    }
    return (
      <Page />
    )
  }
}
