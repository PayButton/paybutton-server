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
import Head from 'next/head'
import Page from 'components/Page'

if (typeof window !== 'undefined') {
  SuperTokensReact.init(SuperTokensConfig.frontendConfig())
}

function App ({ Component, pageProps }: AppProps): React.ReactElement | null {

  const [chart, setChart] = useState(true);

  useEffect(() => {
    async function doRefresh (): Promise<void> {
      console.log('vai tentar o refresh')
      if (pageProps.fromSupertokens === 'needs-refresh') {
        console.log('needs')
        if (await Session.attemptRefreshingSession()) {
          console.log('relaoding location')
          location.reload()
        } else {
          // user has been logged out
          console.log('redir to auth')
          void redirectToAuth()
        }
      }
    }
    void doRefresh()
    console.log('refresh done')
  }, [pageProps.fromSupertokens])
  if (pageProps.fromSupertokens === 'needs-refresh') {
    console.log("needs refresh!")
    return null
  }
  return (
    <>
      <Head>
        <title>PayButton</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <ErrorBoundary>
        <Page chart={chart} setChart={setChart} loggedin={pageProps.userId}>
          <Component {...pageProps} />
        </Page>
      </ErrorBoundary>
    </>
  )
}

export default App
