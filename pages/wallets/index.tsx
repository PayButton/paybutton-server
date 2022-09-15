import React from 'react'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import WalletCard from 'components/Wallet/WalletCard'
import WalletForm from 'components/Wallet/WalletForm'

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

interface WalletsProps {
  userId: string
}

interface WalletsState {
  wallets: [{default_wallet: boolean, name: string, paybuttons: any[], xec_balance: string, bch_balance: string, payments: string}]
}

export default function Wallets ({ userId }: WalletsProps): React.ReactElement {
  return (
    <ThirdPartyEmailPasswordAuthNoSSR>
      <ProtectedPage userId={userId} />
    </ThirdPartyEmailPasswordAuthNoSSR>
  )
}

class ProtectedPage extends React.Component<WalletsProps, WalletsState> {
  constructor (props: WalletsProps) {
    super(props)
    this.state = {
      wallets: [
        {
          default_wallet: true,
          name: 'My Wallet',
          xec_balance: '103742123.05',
          bch_balance: '41.36',
          payments: '453',
          paybuttons: [
            { name: 'Paybutton XEC', id: 1 },
            { name: 'CoinDance BCH', id: 3 },
            { name: 'Paybutton XEC & CoinDance BCH', id: 3 }
          ]
        },
        {
          default_wallet: false,
          name: 'XEC Wallet',
          xec_balance: '103742123.05',
          bch_balance: '0',
          payments: '234',
          paybuttons: [
            { name: 'Paybutton XEC', id: 1 }
          ]
        },
        {
          default_wallet: false,
          name: 'BCH Wallet',
          xec_balance: '0',
          bch_balance: '41.36',
          payments: '198',
          paybuttons: [
            { name: 'CoinDance BCH', id: 3 }
          ]
        }
      ]
    }
  }

  render (): React.ReactElement {
    return (
      <>
        <h2>Wallets</h2>
        <div>
        {this.state.wallets.sort((a, b) => Number(b.default_wallet) - Number(a.default_wallet)).map(wallets =>
              <WalletCard key={wallets.name} walletInfo={wallets} />
        )}
        <WalletForm />
        </div>
      </>
    )
  }
}
