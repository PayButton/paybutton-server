import React from 'react'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import { NetworkList } from 'components/Network'
import { Network } from '@prisma/client'
import { UserNetworksInfo } from 'services/networkService'

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
      userId: session.getUserId()
    }
  }
}

interface NetworksProps {
  userId: string
}

interface NetworksState {
  networks: Network[]
  userNetworks: UserNetworksInfo[]
}

export default class Networks extends React.Component<NetworksProps, NetworksState> {
  constructor (props: NetworksProps) {
    super(props)
    this.props = props
    this.state = {
      networks: [],
      userNetworks: []
    }
  }

  async componentDidMount (): Promise<void> {
    await this.fetchNetworks()
  }

  async fetchNetworks (): Promise<void> {
    const res = await fetch('/api/networks/', {
      method: 'GET'
    })
    const networksResponse = await fetch('/api/networks/user/', {
      method: 'GET'
    })
    if (res.status === 200) {
      this.setState({
        networks: await res.json()
      })
    }
    if (networksResponse.status === 200) {
      this.setState({
        userNetworks: await networksResponse.json()
      })
    }
  }

  render (): React.ReactElement {
    if (this.state.networks !== []) {
      return (
        <>
          <h2>Networks</h2>
          <NetworkList networks={this.state.networks} userNetworks={this.state.userNetworks} />
        </>
      )
    }
  }
}
