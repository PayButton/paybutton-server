import Head from 'next/head'
import React from 'react'
import Image from 'next/image'
import logoImageSource from 'assets/logo.png'
import SignUp from 'components/Auth/SignUp'
import style from 'styles/signin.module.css'

export default function Signup (): JSX.Element {
  return (
    <div>
      <Head>
        <title>PayButton | Sign Up</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={style.login_ctn}>
      <Image src={logoImageSource} alt='PayButton' />
        <div className={style.login_box}>
          <SignUp/>
        </div>
      </div>
    </div>
  )
}
