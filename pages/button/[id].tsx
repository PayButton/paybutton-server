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
import { KeyValueT, ResponseMessage, SOCKET_MESSAGES, SUPPORTED_QUOTES } from 'constants/index'
import config from 'config'
import io from 'socket.io-client'
import PaybuttonTrigger from 'components/Paybutton/PaybuttonTrigger'

export const getServerSideProps: GetServerSideProps = async (context) => {
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
  const [paybutton, setPaybutton] = useState<PaybuttonWithAddresses | undefined>(undefined)
  const [isSyncing, setIsSyncing] = useState<KeyValueT<boolean>>({})
  const [tableRefreshCount, setTableRefreshCount] = useState<number>(0)
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all')
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

    socket.on(SOCKET_MESSAGES.INCOMING_TXS, (broadcastedData: BroadcastTxData) => {
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

  const downloadCSV = async (paybutton: { id: string }, currency: string): Promise<void> => {
    try {
      const currencies = currency === '' ? SUPPORTED_QUOTES : [currency]
      for (let index = 0; index < currencies.length; index++) {
        const c = currencies[index]
        const response = await fetch(`/api/paybutton/download/transactions/${paybutton.id}?currency=${c}`)

        if (!response.ok) {
          throw new Error('Failed to download CSV')
        }
        const fileName = `${paybutton.id}-${c}-transactions`

        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = `${fileName}.csv`

        document.body.appendChild(link)
        link.click()
        link.remove()
      }
    } catch (error) {
      console.error('An error occurred while downloading the CSV:', error)
    }
  }

  const handleExport = (): void => {
    const currencyParam = selectedCurrency === 'all' ? '' : selectedCurrency
    void downloadCSV(paybutton!, currencyParam)
  }

  if (paybutton != null) {
    return (
      <>
        <div className='back_btn' onClick={() => router.back()}>Back</div>
        <PaybuttonDetail paybutton={paybutton} refreshPaybutton={refreshPaybutton}/>
        <div style={{ display: 'flex', alignItems: 'center', alignContent: 'center', justifyContent: 'space-between' }}>
          <h4>Transactions</h4>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="button_outline button_small"
              style={{ marginBottom: '0' }}
            >
              <option value='all'>All Currencies</option>
              {SUPPORTED_QUOTES.map(currency => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>

            <div
              onClick={handleExport}
              className="button_outline button_small export_btn"
            >
              Export as CSV
            </div>
          </div>
        </div>

        <AddressTransactions addressSyncing={isSyncing} tableRefreshCount={tableRefreshCount}/>
        <PaybuttonTrigger paybuttonId={paybutton.id}/>
      </>
    )
  }
  return (
    <Page />
  )
}
