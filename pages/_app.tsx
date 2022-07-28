import 'simpledotcss/simple.min.css'
import 'styles/variables.css'
import 'styles/global.css'
import React, { useEffect, useState } from 'react'
import type { AppProps } from 'next/app'
import SuperTokensReact from 'supertokens-auth-react'
import * as SuperTokensConfig from '../config/frontendConfig'
import Session from 'supertokens-auth-react/recipe/session'
import { redirectToAuth } from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import ErrorBoundary from 'components/ErrorBoundary'
import Page from 'components/Page'

if (typeof window !== 'undefined') {
  SuperTokensReact.init(SuperTokensConfig.frontendConfig())
}

function App ({ Component, pageProps }: AppProps): React.ReactElement | null {

  const [chart, setChart] = useState(true);

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
        <Page chart={chart} setChart={setChart}>
          <Component {...pageProps} />
        </Page>
    </ErrorBoundary>
  )
}

export default App
