import React from 'react'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import WalletCard from 'components/Wallet/WalletCard'
import { Network } from '@prisma/client'

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
  wallets: [{name: string, network: string, paybuttons: any[], balance: string, payments: string}]
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
          name: 'Default Wallet',
          network: 'eCash',
          balance: '103742123.05',
          payments: '453',
          paybuttons: [
            { name: 'Paybutton XEC', id: 1 },
            { name: 'CoinDance BCH', id: 3 },
            { name: 'Paybutton XEC & CoinDance BCH', id: 3 }
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
        {this.state.wallets.map(wallets =>
              <WalletCard key={wallets.name} walletInfo={wallets} />
        )}
        </div>
      </>
    )
  }
}
