import React from 'react'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import Page from 'components/Page'
import Router from 'next/router'
import { PaybuttonDetail } from 'components/Paybutton'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { AddressTransactions } from 'components/Transaction'
import { Transaction } from '@prisma/client'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'

import { useState, useEffect, useRef } from "react";
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

interface PaybuttonState {
  transactions: {
    [address: string]: Transaction
  }
  paybutton: PaybuttonWithAddresses | undefined
}

export default function Home ({ paybuttonId }: PaybuttonProps): React.ReactElement {
  return (
    <ThirdPartyEmailPasswordAuthNoSSR>
      <ProtectedPage paybuttonId={paybuttonId} />
    </ThirdPartyEmailPasswordAuthNoSSR>
  )
}

const ProtectedPage = (props: PaybuttonProps) => {
  const [transactions, setTransactions] = useState({});
  const [paybutton, setPaybutton] = useState(undefined as PaybuttonWithAddresses | undefined);
  // const [streamReader, setStreamReader] = useState(undefined as ReadableStreamDefaultReader);
  const router = useRouter()

  const fetchTransactions = async (address: string) => {
    const res = await fetch(`/api/address/transactions/${address}`, {
      method: 'GET'
    })
    const ok = await res.json()
    if (res.status === 200) {
      setTransactions(prevTransactions => ({ ...prevTransactions, [address]: ok }));
    }
  }

  const fetchPaybutton = async () => {
    const res = await fetch(`/api/paybutton/${props.paybuttonId}`, {
      method: 'GET'
    })
    if (res.status === 200) {
      const paybuttonData = await res.json();
      setPaybutton(paybuttonData);
    }
  }

  const createReader = async (addressString: string): Promise<void> => {
    console.log('hmm')
    //const res = await fetch(`http://localhost:5000/events`)
    const es = new EventSource('http://localhost:5000/events');
    es.onmessage = (msg: Event) => console.log('opa', msg)
    //const reader = res.body?.getReader()
    //console.log('hmm', reader)
    //if (reader === undefined) throw Error("WIP")
   // setStreamReader(reader)
  }

  /*
  const listen = async (addressString: string): Promise<void> => {
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await streamReader.read();
      if (done) {
        console.log('Stream complete');
        break
      }

      let data = decoder.decode(value)
      console.log('uiauiuaiu', data);
      //await fetchAllTransactions()
    }
  }
  */

  const refreshPaybutton = () => {
    fetchPaybutton();
  }

  const handleLogout = async () => {
    await ThirdPartyEmailPassword.signOut()
    ThirdPartyEmailPassword.redirectToAuth()
  }

  useEffect(() => {
    fetchPaybutton();
  }, [])
  /* 
  useEffect(() => {
    if (streamReader) {
      streamReader.cancel();
    }
  }, [streamReader]);
  */ 

  useEffect(() => {
    if (paybutton) {
      console.log('oia,', paybutton)
      for (const connector of paybutton.addresses) {
        fetchTransactions(connector.address.address)
      }
      createReader('WIP')
      // Fetch all transactions and updates here
      // You may need to adjust this according to your needs
    }
  }, [paybutton]);

  if (paybutton && Object.keys(transactions).length !== 0) {
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

