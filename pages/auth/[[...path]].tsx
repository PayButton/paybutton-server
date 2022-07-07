import Head from 'next/head'
import React, { useEffect } from 'react'
import dynamic from 'next/dynamic'
import SuperTokens from 'supertokens-auth-react'
import { redirectToAuth } from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import Image from 'next/image'
import logoImageSource from 'assets/logo.png'

const SuperTokensComponentNoSSR = dynamic(
  new Promise((resolve) => resolve(SuperTokens.getRoutingComponent)),
  { ssr: false }
)

export default function Auth (): React.ReactElement {
  useEffect(() => {
    if (!SuperTokens.canHandleRoute()) {
      redirectToAuth()
    }
  }, [])

  return (
    <div>
      <Head>
        <title>PayButton.io</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className='login_ctn'>
      <Image src={logoImageSource} alt='PayButton' width={200} height={37} />
        <SuperTokensComponentNoSSR />
      </main>
    </div>
  )
}
