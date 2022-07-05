import 'simpledotcss/simple.min.css'
import 'styles/variables.css'
import 'styles/global.css'
import Layout from 'components/Layout'
import React, { useEffect } from 'react'
import type { AppProps } from 'next/app'
import SuperTokensReact from 'supertokens-auth-react'
import * as SuperTokensConfig from '../config/frontendConfig'
import Session from 'supertokens-auth-react/recipe/session'
import { redirectToAuth } from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import ErrorBoundary from 'components/ErrorBoundary'
import Dashboard from 'assets/dashboard-icon.png'
import Payments from 'assets/payments-icon.png'
import PaybuttonsIcon from 'assets/button-icon.png'
import Wallets from 'assets/wallet-icon.png'
import Networks from 'assets/network-icon.png'
import Account from 'assets/user-icon.png'
import Help from 'assets/help-icon.png'
import Logout from 'assets/logout-icon.png'

if (typeof window !== 'undefined') {
  SuperTokensReact.init(SuperTokensConfig.frontendConfig())
}

function App ({ Component, pageProps }: AppProps): React.ReactElement | null {
  const MENU_ITEMS = [
    {
      name:'Dashboard',
      image: Dashboard
    },
    {
      name:'Payments',
      image: Payments
    },
    {
      name:'PayButtons',
      image: PaybuttonsIcon
    },
    {
      name:'Wallets',
      image: Wallets
    },
    {
      name:'Networks',
      image: Networks
    },
    {
      name:'Account',
      image: Account
    },
    {
      name:'Help',
      image: Help
    },
    {
      name:'Logout',
      image: Logout
    },
  ]

  useEffect(() => {
    async function doRefresh (): Promise<void> {
      if (pageProps.fromSupertokens === 'needs-refresh') {
        if (await Session.attemptRefreshingSession()) {
          location.reload()
        } else {
          // user has been logged out
          void redirectToAuth()
        }
      }
    }
    void doRefresh()
  }, [pageProps.fromSupertokens])
  if (pageProps.fromSupertokens === 'needs-refresh') {
    return null
  }
  return (
    <ErrorBoundary>
      <Layout menuItems={MENU_ITEMS} logoImageSource=''>
        <Component {...pageProps} />
      </Layout>
    </ErrorBoundary>
  )
}

export default App
