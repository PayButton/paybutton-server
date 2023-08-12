import Head from 'next/head'
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import logoImageSource from 'assets/logo.png'
import { sendVerificationEmail } from 'supertokens-web-js/recipe/emailverification'

const SEND_EMAIL_DELAY = 60

async function sendEmail (): Promise<void> {
  try {
    await fetch('/api/user/emailSent', {
      method: 'POST'
    })
    const response = await sendVerificationEmail()
    if (response.status === 'EMAIL_ALREADY_VERIFIED_ERROR') {
      // This can happen if the info about email verification in the session was outdated.
      // Redirect the user to the home page
      window.location.assign('/')
    } else {
      // email was sent successfully.
    }
  } catch (err: any) {
    if (err.isSuperTokensGeneralError === true) {
      // this may be a custom error message sent from the API by you.
      window.alert(err.message)
    } else {
      window.alert('Oops! Something went wrong.')
    }
  }
}

export default function Verify (): JSX.Element {
  const [lastSentVerificationEmailAt, setLastSentVerificationEmailAt] = useState<Date>()
  const [resendCount, setResendCount] = useState<number>()
  const [secondsElapsed, setSecondsElapsed] = useState<number>()
  const [canResendEmail, setCanResendEmail] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)

  async function resendEmail (): Promise<void> {
    if (!canResendEmail) return
    setResendingEmail(true)
    setCanResendEmail(false)
    void await sendEmail()
    setLastSentVerificationEmailAt(new Date())
    setResendingEmail(false)
  }

  useEffect(() => {
    async function fetchUserInfo (): Promise<void> {
      const res = await fetch('/api/user/', {
        method: 'GET'
      })
      const userProfile = await res.json()
      if (userProfile.lastSentVerificationEmailAt === null) {
        void await sendEmail()
      }
      setLastSentVerificationEmailAt(new Date(userProfile.lastSentVerificationEmailAt))
    }
    void fetchUserInfo()
  }, [])

  useEffect(() => {
    if (!resendingEmail && secondsElapsed !== undefined && secondsElapsed > SEND_EMAIL_DELAY) {
      setCanResendEmail(true)
    }
  }, [secondsElapsed])

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastSentVerificationEmailAt !== undefined) {
        const thisSecondsElapsed = Math.floor((new Date().getTime() - lastSentVerificationEmailAt.getTime()) / 1000)
        setSecondsElapsed(thisSecondsElapsed)
        const newCount = Math.max(
          SEND_EMAIL_DELAY - thisSecondsElapsed,
          -1
        )
        setResendCount(newCount)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [secondsElapsed, lastSentVerificationEmailAt])

  return (
    <div>
      <Head>
        <title>PayButton</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className='login_ctn'>
      <Image src={logoImageSource} alt='PayButton' width={200} height={37} />
        <div>
        E-mail sent, Verify your e-mail box.
        </div>
        <div>
          <button disabled={!canResendEmail} onClick={() => { void resendEmail() }}>Resend e-mail</button>
          {!canResendEmail && resendCount !== undefined && resendCount >= 0 ? <div>{resendCount}</div> : ''}
        </div>
      </div>
    </div>
  )
}
