import React from 'react'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { websiteDomain } from 'config/appInfo'
import AddPayButtonForm from 'components/AddPayButtonForm'
import { PayButtonsList } from 'components/PayButton'
import { ButtonResource } from 'types'

const FEATURE_ADD_PAYBUTTON = websiteDomain.includes('feat-add-button')
                              || websiteDomain.includes('localhost')

const ThirdPartyEmailPasswordAuthNoSSR = dynamic(
  new Promise((res) =>
    res(ThirdPartyEmailPassword.ThirdPartyEmailPasswordAuth)
  ),
  { ssr: false }
)

export async function getServerSideProps(context) {
  // this runs on the backend, so we must call init on supertokens-node SDK
  supertokensNode.init(SuperTokensConfig.backendConfig())
  let session
  try {
    session = await Session.getSession(context.req, context.res)
  } catch (err) {
    if (err.type === Session.Error.TRY_REFRESH_TOKEN) {
      return { props: { fromSupertokens: 'needs-refresh' } }
    } else if (err.type === Session.Error.UNAUTHORISED) {
      return { props: {} }
    } else {
      throw err
    }
  }

  return {
    props: { userId: session.getUserId() },
  }
}

export default function Home(props) {
  return (
    <ThirdPartyEmailPasswordAuthNoSSR>
      <ProtectedPage userId={props.userId} />
    </ThirdPartyEmailPasswordAuthNoSSR>
  )
}

function ProtectedPage({ userId }) {
  const [payButtons, setPayButtons] = React.useState([])

  async function logoutClicked() {
    await ThirdPartyEmailPassword.signOut()
    ThirdPartyEmailPassword.redirectToAuth()
  }

  async function fetchPayButtons() {
    const res = await fetch(`/api/button/${userId}`)
    if (res.status === 200) {
      const json = await res.json()
      console.log('Fetched PayButtons: ', json)
      return json
    }
  }

  async function addPayButton() {
    const res = await fetch('/api/button', {
      method: 'POST',
      body: JSON.stringify({ 
      userId: userId,
      addresses: ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc', 
                  'bitcoincash:qrw5fzqlxzf639m8s7fq7wn33as7nfw9wg9zphxlxe']
      })
    })
    if (res.status === 200) {
      const json = await res.json()
      setPayButtons([...payButtons, json])
    }
  }

  React.useEffect(() => {
    if (FEATURE_ADD_PAYBUTTON) {
      (async () => {
        const fetchedPayButtons: ButtonResource[] = await fetchPayButtons()
        setPayButtons([...payButtons, ...fetchedPayButtons])
      })()
    }
  }, [])
  return (
    <div className={styles.container}>
      <Head>
        <title>PayButton.io</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://nextjs.org">PayButton.io</a>
        </h1>
        {FEATURE_ADD_PAYBUTTON && <PayButtonsList payButtons={payButtons} />}
        <div
          style={{
            display: 'flex',
            height: '70px',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingLeft: '75px',
            paddingRight: '75px',
          }}
        >
          <div
            onClick={logoutClicked}
            style={{
              display: 'flex',
              width: '116px',
              height: '42px',
              backgroundColor: '#000000',
              borderRadius: '10px',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
            }}
          >
            SIGN OUT
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            height: '70px',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingLeft: '75px',
            paddingRight: '75px',
          }}
        >
          <div
            onClick={addPayButton}
            style={{
              display: 'flex',
              width: '150px',
              height: '42px',
              backgroundColor: 'rgb(247 54 54)',
              borderRadius: '10px',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
            }}
          >
            Add a PayButton
          </div>
        </div>
          {FEATURE_ADD_PAYBUTTON && <AddPayButtonForm />}
        <div className={styles.grid}>
        </div>
      </main>
      <footer className={styles.footer}>
      </footer>
    </div>
  )
}
