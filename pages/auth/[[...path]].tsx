import Head from 'next/head'
import React, { useEffect } from 'react'
import dynamic from 'next/dynamic'
import SuperTokens from 'supertokens-auth-react'
import { redirectToAuth } from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import Image from 'next/image'
import logoImageSource from 'assets/logo.png'

const SuperTokensComponentNoSSR = dynamic(
  new Promise((res) => res(SuperTokens.getRoutingComponent)),
  { ssr: false }
)

export default function Auth() {
  useEffect(() => {
    const isCanHandleRoute = SuperTokens.canHandleRoute()
    console.log('can handle route?', isCanHandleRoute)
    if (isCanHandleRoute === false) {
      redirectToAuth()
    }
  }, [])

  return (
    <div>
      <Head>
        <title>PayButton</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className='login_ctn'>
        <span> ok </span>
      <Image src={logoImageSource} alt='PayButton' width={200} height={37} />
        <SuperTokensComponentNoSSR />
      </div>
    </div>
  )
}
