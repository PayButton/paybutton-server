import '../styles/globals.css'
import React from 'react'
import SuperTokensReact from 'supertokens-auth-react'
import SuperTokensNode from 'supertokens-node'

import { frontendConfig, backendConfig } from './supertokensConfig'

if (typeof window !== 'undefined') {
  SuperTokensReact.init(frontendConfig())
} else {
  SuperTokensNode.init(backendConfig())
}

function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default App