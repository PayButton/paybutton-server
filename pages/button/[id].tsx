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
import { BroadcastTxData, TxEmitEvent } from 'ws-service/types'
import { KeyValueT, ResponseMessage } from 'constants/index'
import { TransactionWithAddressAndPrices } from 'services/transactionService'
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
  const [transactions, setTransactions] = useState<undefined | KeyValueT<TransactionWithAddressAndPrices[]>>({})
  const [paybutton, setPaybutton] = useState(undefined as PaybuttonWithAddresses | undefined)
  const [isSynced, setIsSynced] = useState<KeyValueT<boolean>>({})
  const router = useRouter()

  const fetchTransactions = async (address: string): Promise<TransactionWithAddressAndPrices[]> => {
    const res = await fetch(`/api/address/transactions/${address}`, {
      method: 'GET'
    })
    const resData = await res.json()
    if (res.status === 200) {
      if (transactions === undefined) setTransactions({})
      setTransactions(prevTransactions => ({ ...prevTransactions, [address]: resData }))
      return resData
    } else {
      throw new Error(resData.message)
    }
  }

  const updateIsSynced = (addressStringList: string[]): void => {
    const newIsSynced = { ...isSynced }
    addressStringList.forEach((addressString) => {
      newIsSynced[addressString] = true
    })
    setIsSynced(newIsSynced)
  }

  const fetchPaybutton = async (): Promise<PaybuttonWithAddresses> => {
    const res = await fetch(`/api/paybutton/${props.paybuttonId}`, {
      method: 'GET'
    })
    let resData = await res.json() as PaybuttonWithAddresses | ResponseMessage
    if (res.status === 200) {
      resData = resData as PaybuttonWithAddresses
      setPaybutton(resData)
      const newIsSynced = { ...isSynced }
      resData.addresses.forEach(addr => {
        newIsSynced[addr.address.address] = addr.address.lastSynced != null
      })
      setIsSynced(newIsSynced)
      return resData
    } else {
      resData = resData as ResponseMessage
      throw new Error(resData.message)
    }
  }

  const refreshPaybutton = (): void => {
    void fetchPaybutton()
  }

  const setUpSocket = async (addresses: string[]): Promise<void> => {
    const socket = io(`${config.wsBaseURL}/addresses`, {
      query: { addresses }
    })

    socket.on('incoming-txs' as TxEmitEvent, (broadcastedData: BroadcastTxData) => {
      updateIsSynced([broadcastedData.address])
      setTransactions(prevTransactions => {
        const old = prevTransactions === undefined ? {} : prevTransactions
        return {
          ...old,
          [broadcastedData.address]: [
            ...old[broadcastedData.address]
              .filter(tx => !broadcastedData.txs.map(newTx => newTx.hash).includes(tx.hash)), // avoid keeping unconfirmed tx together with confirmed
            ...broadcastedData.txs
          ]
        }
      })
    })
  }

  const getDataAndSetUpSocket = async (): Promise<void> => {
    const paybuttonData = await fetchPaybutton()
    const addresses: string[] = paybuttonData.addresses.map(c => c.address.address)
    await Promise.all(addresses.map(async addr => {
      await fetchTransactions(addr)
    }))
    await setUpSocket(addresses)
  }

  useEffect(() => {
    void getDataAndSetUpSocket()
  }, [])

  if (paybutton != null && transactions !== undefined) {
    return (
      <>
        <div className='back_btn' onClick={() => router.back()}>Back</div>
        <PaybuttonDetail paybutton={paybutton} refreshPaybutton={refreshPaybutton}/>
        <h4>Transactions</h4>
        <AddressTransactions addressTransactions={transactions} addressSynced={isSynced}/>
        <PaybuttonTrigger paybuttonId={paybutton.id}/>
      </>
    )
  }
  return (
    <Page />
  )
}
