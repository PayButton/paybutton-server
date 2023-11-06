import React, { useState, useEffect } from 'react'
import Page from 'components/Page'
import { PaybuttonDetail } from 'components/Paybutton'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { AddressTransactions } from 'components/Transaction'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { BroadcastTxData } from 'ws-service/types'
import { KeyValueT, ResponseMessage } from 'constants/index'
import config from 'config'
import io from 'socket.io-client'
import PaybuttonTrigger from 'components/Paybutton/PaybuttonTrigger'

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

export default function Button (props: PaybuttonProps): React.ReactElement {
  const [paybutton, setPaybutton] = useState(undefined as PaybuttonWithAddresses | undefined)
  const [isSyncing, setIsSyncing] = useState<KeyValueT<boolean>>({})
  const [tableRefreshCount, setTableRefreshCount] = useState<number>(0)
  const router = useRouter()

  const updateIsSyncing = (addressStringList: string[]): void => {
    const newIsSyncing = { ...isSyncing }
    addressStringList.forEach((addressString) => {
      newIsSyncing[addressString] = true
    })
    setIsSyncing(newIsSyncing)
  }

  const fetchPaybutton = async (): Promise<PaybuttonWithAddresses> => {
    const res = await fetch(`/api/paybutton/${props.paybuttonId}`, {
      method: 'GET'
    })
    let resData = await res.json() as PaybuttonWithAddresses | ResponseMessage
    if (res.status === 200) {
      resData = resData as PaybuttonWithAddresses
      setPaybutton(resData)
      const newIsSyncing = { ...isSyncing }
      resData.addresses.forEach(addr => {
        newIsSyncing[addr.address.address] = addr.address.syncing != null
      })
      setIsSyncing(newIsSyncing)
      return resData
    } else {
      resData = resData as ResponseMessage
      throw new Error(resData.message)
    }
  }

  const refreshPaybutton = (): void => {
    void getDataAndSetUpSocket()
  }

  const setUpSocket = async (addresses: string[]): Promise<void> => {
    const socket = io(`${config.wsBaseURL}/addresses`, {
      query: { addresses }
    })

    socket.on('incoming-txs', (broadcastedData: BroadcastTxData) => {
      setTableRefreshCount(tableRefreshCount + 1)
      updateIsSyncing([broadcastedData.address])
    })
  }

  const getDataAndSetUpSocket = async (): Promise<void> => {
    const paybuttonData = await fetchPaybutton()
    const addresses: string[] = paybuttonData.addresses.map(c => c.address.address)
    await setUpSocket(addresses)
  }

  useEffect(() => {
    void getDataAndSetUpSocket()
  }, [])

  if (paybutton != null) {
    return (
      <>
        <div className='back_btn' onClick={() => router.back()}>Back</div>
        <PaybuttonDetail paybutton={paybutton} refreshPaybutton={refreshPaybutton}/>
        <h4>Transactions</h4>
        <AddressTransactions addressSyncing={isSyncing} tableRefreshCounter={tableRefreshCount}/>
        <PaybuttonTrigger paybuttonId={paybutton.id}/>
      </>
    )
  }
  return (
    <Page />
  )
}
