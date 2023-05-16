import React, { useState, useEffect } from 'react'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import Page from 'components/Page'
import { PaybuttonDetail } from 'components/Paybutton'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { AddressTransactions } from 'components/Transaction'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'

import { useRouter } from 'next/router'

const ThirdPartyEmailPasswordAuthNoSSR = dynamic(
  new Promise((resolve, reject) =>
    resolve(ThirdPartyEmailPassword.ThirdPartyEmailPasswordAuth)
  ),
  { ssr: false }
)

export const getServerSideProps: GetServerSideProps = async (context) => {
  // this runs on the backend, so we must call init on supertokens-node SDK
  supertokensNode.init(SuperTokensConfig.backendConfig())
  let session
  try {
    session = await Session.getSession(context.req, context.res)
  } catch (err: any) {
    if (err.type === Session.Error.TRY_REFRESH_TOKEN) {
      return { props: { fromSupertokens: 'needs-refresh' } }
    } else if (err.type === Session.Error.UNAUTHORISED) {
      return { props: {} }
    } else {
      throw err
    }
  }

  return {
    props: {
      userId: session.getUserId(),
      paybuttonId: context.params.id
    }
  }
}

interface PaybuttonProps {
  paybuttonId: string
}

export default function Home ({ paybuttonId }: PaybuttonProps): React.ReactElement {
  return (
    <ThirdPartyEmailPasswordAuthNoSSR>
      <ProtectedPage paybuttonId={paybuttonId} />
    </ThirdPartyEmailPasswordAuthNoSSR>
  )
}

const ProtectedPage = (props: PaybuttonProps): React.ReactElement => {
  const [transactions, setTransactions] = useState({})
  const [paybutton, setPaybutton] = useState(undefined as PaybuttonWithAddresses | undefined)
  const router = useRouter()

  const fetchTransactions = async (address: string): Promise<void> => {
    const res = await fetch(`/api/address/transactions/${address}`, {
      method: 'GET'
    })
    const ok = await res.json()
    if (res.status === 200) {
      setTransactions(prevTransactions => ({ ...prevTransactions, [address]: ok }))
    }
  }

  const fetchPaybutton = async (): Promise<void> => {
    const res = await fetch(`/api/paybutton/${props.paybuttonId}`, {
      method: 'GET'
    })
    if (res.status === 200) {
      const paybuttonData = await res.json()
      setPaybutton(paybuttonData)
    }
  }

  const createListeners = async (es: EventSource, addressList: string[]): Promise<void> => {
    for (const addr of addressList) {
      es.addEventListener(`tx-${addr}`,
        (msg: Event) => {
          console.log('opa', msg)
        }
      )
    }
  }

  const refreshPaybutton = (): void => {
    void fetchPaybutton()
  }

  useEffect(() => {
    void fetchPaybutton()
  }, [])

  useEffect(() => {
    if (paybutton != null) {
      const addressesToListen: string[] = []
      for (const connector of paybutton.addresses) {
        void fetchTransactions(connector.address.address)
        addressesToListen.push(connector.address.address)
      }
      const es = new EventSource('http://localhost:5000/events')
      void createListeners(es, addressesToListen)
      return () => es.close()
    }
  }, [paybutton])

  if ((paybutton != null) && Object.keys(transactions).length !== 0) {
    return (
      <>
        <div className='back_btn' onClick={() => router.back()}>Back</div>
        <PaybuttonDetail paybutton={paybutton} refreshPaybutton={refreshPaybutton}/>
        <h4>Transactions</h4>
        <AddressTransactions addressTransactions={transactions} />
      </>
    )
  }
  return (
    <Page />
  )
}
