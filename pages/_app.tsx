import 'simpledotcss/simple.min.css'
import 'styles/variables.css'
import 'styles/global.css'
import React, { useEffect, useState } from 'react'
import type { AppProps } from 'next/app'
import SuperTokensWebJs from 'supertokens-web-js'
import * as SuperTokensConfig from '../config/frontendConfig'
import ErrorBoundary from 'components/ErrorBoundary'
import Head from 'next/head'
import Page from 'components/Page'
import SessionJS from 'supertokens-web-js/recipe/session'
import { EmailVerificationClaim } from 'supertokens-web-js/recipe/emailverification'

if (typeof window !== 'undefined') {
  SuperTokensWebJs.init(SuperTokensConfig.frontendConfig())
}

const AUTHORIZED_UNLOGGED_URLS = [
  '/signin',
  '/signup',
  '/password-recover'
]

function App ({ Component, pageProps }: AppProps): React.ReactElement | null {
  const [chart, setChart] = useState(true)

  useEffect(() => {
    void (async () => {
      if (await SessionJS.doesSessionExist()) {
        const validationErrors = await SessionJS.validateClaims()
        if (validationErrors.length === 0) {
          // Verified address user
          if (AUTHORIZED_UNLOGGED_URLS.includes(window.location.pathname)) {
            window.location.href = '/'
          }
        } else {
          for (const err of validationErrors) {
            if (err.validatorId === EmailVerificationClaim.id) {
              // email is not verified
              if (window.location.pathname !== '/verify') window.location.href = '/verify'
            }
          }
        }
      } else if (!AUTHORIZED_UNLOGGED_URLS.includes(window.location.pathname)) {
        window.location.href = '/signin'
      }
    })()
  }, [])

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
