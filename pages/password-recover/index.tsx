import Head from 'next/head'
import React from 'react'
import Image from 'next/image'
import logoImageSource from 'assets/logo.png'
import ForgotPassword from 'components/Auth/ForgotPassword'

export default function Signin (): JSX.Element {
  return (
    <div>
      <Head>
        <title>PayButton</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className='login_ctn'>
      <Image src={logoImageSource} alt='PayButton' width={200} height={37} />
        <ForgotPassword/>
      </div>
    </div>
  )
}
