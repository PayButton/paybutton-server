import 'simpledotcss/simple.min.css'
import 'styles/variables.css'
import 'styles/global.css'
import React, { useEffect, useState } from 'react'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/navigation'
import SuperTokensWebJs from 'supertokens-web-js'
import * as SuperTokensConfig from '../config/frontendConfig'
import Session from 'supertokens-auth-react/recipe/session'
import ErrorBoundary from 'components/ErrorBoundary'
import Head from 'next/head'
import Page from 'components/Page'
import SessionJS from 'supertokens-web-js/recipe/session'

if (typeof window !== 'undefined') {
  SuperTokensWebJs.init(SuperTokensConfig.frontendConfig())
}

function App ({ Component, pageProps }: AppProps): React.ReactElement | null {
  const router = useRouter()
  async function redirectIfNotSignedIn (): Promise<void> {
    if (!(await SessionJS.doesSessionExist())) {
      router.push('/signin')
    }
  }

  const [chart, setChart] = useState(true)

  useEffect(() => {
    async function doRefresh (): Promise<void> {
      await redirectIfNotSignedIn()
      if (pageProps.fromSupertokens === 'needs-refresh') {
        if (await Session.attemptRefreshingSession()) {
          location.reload()
        } else {
          // user has been logged out
          router.push('/signin')
        }
      }
    }
    void doRefresh()
  }, [pageProps.fromSupertokens])
  if (pageProps.fromSupertokens === 'needs-refresh') {
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
