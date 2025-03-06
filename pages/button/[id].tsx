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
import { KeyValueT, NETWORK_TICKERS_FROM_ID, ResponseMessage, SOCKET_MESSAGES } from 'constants/index'
import config from 'config'
import io from 'socket.io-client'
import PaybuttonTrigger from 'components/Paybutton/PaybuttonTrigger'
import { UserProfile } from '@prisma/client'
import { fetchUserProfileFromId } from 'services/userService'
import { removeUnserializableFields } from 'utils'
import moment from 'moment-timezone'
import Button from 'components/Button'

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

  const userProfile = await fetchUserProfileFromId(session.getUserId())

  removeUnserializableFields(userProfile)

  return {
    props: {
      userProfile,
      paybuttonId: context.params?.id
    }
  }
}

interface PaybuttonProps {
  paybuttonId: string
  userProfile: UserProfile
}

export default function PayButton (props: PaybuttonProps): React.ReactElement {
  const [paybutton, setPaybutton] = useState<PaybuttonWithAddresses | undefined>(undefined)
  const [isSyncing, setIsSyncing] = useState<KeyValueT<boolean>>({})
  const [tableRefreshCount, setTableRefreshCount] = useState<number>(0)
  const [paybuttonNetworks, setPaybuttonNetworks] = useState<number[]>([])
  const [selectedCurrency, setSelectedCurrency] = useState<string>('')
  const userProfile = props.userProfile
  const timezone = userProfile?.preferredTimezone === '' ? moment.tz.guess() : userProfile?.preferredTimezone
  const router = useRouter()
  const [loading, setLoading] = useState(false)

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
    const networkIds: number[] = paybuttonData.addresses.map(c => c.address.networkId)

    setPaybuttonNetworks(networkIds)
    await setUpSocket(addresses)
  }

  useEffect(() => {
    void getDataAndSetUpSocket()
  }, [])

  const downloadCSV = async (paybutton: { id: string, name: string }, currency: string): Promise<void> => {
    try {
      setLoading(true)
      const preferredCurrencyId = userProfile?.preferredCurrencyId ?? ''
      let url = `/api/paybutton/download/transactions/${paybutton.id}?currency=${preferredCurrencyId}`
      const isCurrencyEmptyOrUndefined = (value: string): boolean => (value === '' || value === undefined)
      if (!isCurrencyEmptyOrUndefined(currency)) {
        url += `&network=${currency}`
      }
      const response = await fetch(url, {
        headers: {
          Timezone: moment.tz.guess()
        }
      })

      if (!response.ok) {
        throw new Error('Failed to download CSV')
      }

      const fileName = `${paybutton.name}-${isCurrencyEmptyOrUndefined(currency) ? 'all' : `${currency.toLowerCase()}`}-transactions`

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${fileName}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('An error occurred while downloading the CSV:', error)
    } finally {
      setLoading(false)
      setSelectedCurrency('')
    }
  }

  const handleExport = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const currencyParam = event.target.value !== 'all' ? event.target.value : ''
    setSelectedCurrency(currencyParam)
    void downloadCSV(paybutton!, currencyParam)
  }

  if (paybutton != null) {
    return (
      <>
        <div className='back_btn' onClick={() => router.back()}>Back</div>
        <PaybuttonDetail paybutton={paybutton} refreshPaybutton={refreshPaybutton} listView={false}/>
        <div style={{ display: 'flex', alignItems: 'center', alignContent: 'center', justifyContent: 'space-between' }}>
          <h4>Transactions</h4>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {new Set(paybuttonNetworks).size > 1
              ? (
              <select
                id='export-btn'
                value={selectedCurrency}
                onChange={handleExport}
                disabled={loading}
                className="button_outline button_small"
                style={{ marginBottom: '0', cursor: 'pointer' }}
              >
                <option value='' disabled>{loading ? 'Downloading...' : 'Export as CSV'}</option>
                <option key="all" value="all">
                  {loading ? 'Downloading...' : 'All Currencies'}
                </option>
                {Object.entries(NETWORK_TICKERS_FROM_ID)
                  .filter(([id]) => paybuttonNetworks.includes(Number(id)))
                  .map(([id, ticker]) => (
                    <option key={id} value={ticker}>
                      {loading ? 'Downloading...' : ticker.toUpperCase()}
                    </option>
                  ))}
              </select>
                )
              : (
              <Button
                onClick={handleExport}
                disabled={loading}
                loading={loading}
                variant='small'
              >
                Export as CSV
              </Button>
                )}
          </div>
        </div>

        <AddressTransactions addressSyncing={isSyncing} tableRefreshCount={tableRefreshCount} timezone={timezone}/>
        <PaybuttonTrigger emailCredits={userProfile.emailCredits} paybuttonId={paybutton.id}/>
      </>
    )
  }

  return (
    <Page />
  )
}
