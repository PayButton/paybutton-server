import React from 'react'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import { GetServerSideProps } from 'next'
import { NetworkList } from 'components/Network'
import { Network } from '@prisma/client'
import { UserNetworksInfo } from 'services/networkService'
import TopBar from 'components/TopBar'
import { fetchUserWithSupertokens, UserWithSupertokens } from 'services/userService'
import { removeUnserializableFields } from 'utils/index'
import { frontEndGetSession } from 'utils/setSession'

export const getServerSideProps: GetServerSideProps = async (context) => {
  // this runs on the backend, so we must call init on supertokens-node SDK
  supertokensNode.init(SuperTokensConfig.backendConfig())
  const sessionResult = await frontEndGetSession(context)
  if (!sessionResult.success) {
    return sessionResult.failedResult.payload
  }
  const session = sessionResult.session
  const userId = session.getUserId()
  const user = await fetchUserWithSupertokens(userId)
  removeUnserializableFields(user.userProfile)

  return {
    props: {
      user
    }
  }
}

interface NetworksProps {
  user: UserWithSupertokens
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
          <TopBar title="Networks" user={this.props.user.stUser?.email} />
          <NetworkList networks={this.state.networks} userNetworks={this.state.userNetworks} />
        </>
      )
    }
  }
}
