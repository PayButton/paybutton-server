import React from 'react'
import { useEffect } from 'react'
import SuperTokensReact from 'supertokens-auth-react'
import * as SuperTokensConfig from '../config/frontendConfig'
import Session from 'supertokens-auth-react/recipe/session'
import { redirectToAuth } from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import ErrorBoundary from 'components/ErrorBoundary';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import theme from 'components/Theme'

if (typeof window !== 'undefined') {
  SuperTokensReact.init(SuperTokensConfig.frontendConfig())
}

const cache = createCache({
  key: 'css',
  prepend: true,
});


function App({ Component, pageProps }) {
  useEffect(() => {
    async function doRefresh() {
      if (pageProps.fromSupertokens === 'needs-refresh') {
        if (await Session.attemptRefreshingSession()) {
          location.reload()
        } else {
          // user has been logged out
          redirectToAuth()
        }
      }
    }
    doRefresh()
  }, [pageProps.fromSupertokens])
  if (pageProps.fromSupertokens === 'needs-refresh') {
    return null
  }
  return <ErrorBoundary>
  				<CacheProvider value={cache}>
						<ThemeProvider theme={theme}>
							<CssBaseline />
								<Component {...pageProps} />
						</ThemeProvider>
					</CacheProvider>
        </ErrorBoundary>
}

export default App
