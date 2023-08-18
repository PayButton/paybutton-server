import Head from 'next/head'
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import logoImageSource from 'assets/logo.png'
import { sendVerificationEmail } from 'supertokens-web-js/recipe/emailverification'
import style from 'styles/signin.module.css'

const SEND_EMAIL_DELAY = 60

async function sendEmail (): Promise<void> {
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
}

export default function Verify (): JSX.Element {
  const [lastSentVerificationEmailAt, setLastSentVerificationEmailAt] = useState<Date>()
  const [resendCount, setResendCount] = useState<number>()
  const [secondsElapsed, setSecondsElapsed] = useState<number>()
  const [canResendEmail, setCanResendEmail] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  async function resendEmail (): Promise<void> {
    if (!canResendEmail) return
    setSendingEmail(true)
    setCanResendEmail(false)
    void await sendEmail()
    setLastSentVerificationEmailAt(new Date())
    setSendingEmail(false)
  }

  useEffect(() => {
    async function fetchUserInfo (): Promise<void> {
      const res = await fetch('/api/user/', {
        method: 'GET'
      })
      const userProfile = await res.json()
      if (userProfile.lastSentVerificationEmailAt === null) {
        setSendingEmail(true)
        setCanResendEmail(false)
        void await sendEmail()
        setLastSentVerificationEmailAt(new Date())
        setSendingEmail(false)
      } else {
        setLastSentVerificationEmailAt(new Date(userProfile.lastSentVerificationEmailAt))
      }
    }
    void fetchUserInfo()
  }, [])

  useEffect(() => {
    if (!sendingEmail && secondsElapsed !== undefined && secondsElapsed > SEND_EMAIL_DELAY) {
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

      <div className={style.login_ctn}>
        <Image src={logoImageSource} alt='PayButton' />
        <div className={style.login_box}>
          <div style={{ marginBottom: '20px' }}>
          Email sent, check your inbox.
          </div>
          <div style={{ textAlign: 'center' }}>
            <button disabled={!canResendEmail} onClick={() => { void resendEmail() }} className='button_main button_small'>Resend email</button>
            {!canResendEmail && resendCount !== undefined && resendCount >= 0 ? <div>Can resend in {resendCount}s</div> : ''}
          </div>
      </div>
      </div>
    </div>
  )
}
