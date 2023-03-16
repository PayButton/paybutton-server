import React from 'react'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import WalletCard from 'components/Wallet/WalletCard'
import WalletForm from 'components/Wallet/WalletForm'
import { WalletWithPaymentInfo } from 'services/walletService'
import { AddressWithPaybuttons } from 'services/addressService'

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
  walletsWithPaymentInfo: WalletWithPaymentInfo[]
  userAddresses: AddressWithPaybuttons[]
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
      walletsWithPaymentInfo: [],
      userAddresses: []
    }
  }

  async componentDidMount (): Promise<void> {
    await this.fetchWallets()
  }

  async fetchWallets (): Promise<void> {
    const walletsResponse = await fetch(`/api/wallets?userId=${this.props.userId}`, {
      method: 'GET'
    })
    const addressesResponse = await fetch(`/api/addresses?userId=${this.props.userId}&includePaybuttons=1`, {
      method: 'GET'
    })
    if (walletsResponse.status === 200) {
      this.setState({
        walletsWithPaymentInfo: await walletsResponse.json()
      })
    }
    if (addressesResponse.status === 200) {
      this.setState({
        userAddresses: await addressesResponse.json()
      })
    }
  }

  refreshWalletList = (): void => {
    this.setState(() => {
      void this.fetchWallets()
    })
  }

  render (): React.ReactElement {
    return (
      <>
        <h2>Wallets</h2>
        <div>
        {this.state.walletsWithPaymentInfo.sort((a, b) => {
          /* Sorts in the following order, from first to last, if they exist:
           * Default XEC Wallet, Default BCH Wallet, other wallets.
           */
          if (a.wallet.userProfile?.isXECDefault === true) {
            return -1
          } else if (a.wallet.userProfile?.isBCHDefault === true) {
            if (b.wallet.userProfile?.isXECDefault === true) {
              return 1
            }
            return -1
          }
          return a.wallet.name.localeCompare(b.wallet.name)
        }).map(walletWithPaymentInfo => {
          return <WalletCard
            wallet={walletWithPaymentInfo.wallet}
            paymentInfo={walletWithPaymentInfo.paymentInfo}
            userAddresses={this.state.userAddresses}
            refreshWalletList={this.refreshWalletList}
            key={walletWithPaymentInfo.wallet.name}
          />
        }
        )}
        <WalletForm userAddresses={this.state.userAddresses} refreshWalletList={this.refreshWalletList} userId={this.props.userId}/>
        </div>
      </>
    )
  }
}
