import { useEffect, useState } from 'react'
import Head from 'next/head'
import { verifyEmail } from 'supertokens-web-js/recipe/emailverification'
import style from 'styles/signin.module.css'
import Image from 'next/image'
import logoImageSource from 'assets/logo.png'

export default function Auth (): JSX.Element {
  const [text, setText] = useState('Verifing email...')
  async function consumeVerificationCode (): Promise<void> {
    try {
      const response = await verifyEmail()
      if (response.status === 'EMAIL_VERIFICATION_INVALID_TOKEN_ERROR') {
        // This can happen if the verification code is expired or invalid.
        // You should ask the user to retry
        setText('Oops! Seems like the verification link expired. Please try again')
        // window.location.assign("/verify") // back to the email sending screen. WIP
      } else {
        // email was verified successfully.
        window.location.assign('/dashboard')
      }
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        setText(err.message)
      } else {
        setText('Oops! Something went wrong.')
      }
    }
  }

  useEffect(() => {
    void consumeVerificationCode()
  }, [])

  return (
    <div>
      <Head>
        <title>PayButton</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={style.login_ctn}>
        <Image src={logoImageSource} alt='PayButton' />
        <div className={style.login_box}>
        { text }
        </div>
      </div>
    </div>
  )
}
