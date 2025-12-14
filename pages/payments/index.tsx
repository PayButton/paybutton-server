import React, { useEffect, useMemo, useState } from 'react'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import TableContainerGetter from '../../components/TableContainer/TableContainerGetter'
import { ButtonDisplayData } from 'redis/types'
import Image from 'next/image'
import Link from 'next/link'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import EyeIcon from 'assets/eye-icon.png'
import { formatQuoteValue, compareNumericString, removeUnserializableFields, removeDateFields } from 'utils/index'
import { XEC_NETWORK_ID, BCH_TX_EXPLORER_URL, XEC_TX_EXPLORER_URL, NETWORK_TICKERS_FROM_ID, DECIMALS, HUMAN_READABLE_DATE_FORMAT } from 'constants/index'
import moment from 'moment-timezone'
import TopBar from 'components/TopBar'
import { fetchUserWithSupertokens, UserWithSupertokens } from 'services/userService'
import { Organization, UserProfile } from '@prisma/client'
import Button from 'components/Button'
import style from './payments.module.css'
import SettingsIcon from '../../assets/settings-slider-icon.png'
import Plus from 'assets/plus.png'
import Pencil from 'assets/pencil.png'
import FileText from 'assets/file-text.png'
import InvoiceModal from 'components/Transaction/InvoiceModal'
import { TransactionWithAddressAndPricesAndInvoices } from 'services/transactionService'
import { fetchOrganizationForUser } from 'services/organizationService'
import { InvoiceWithTransaction } from 'services/invoiceService'
import Loading from 'components/Loading'

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

  if (session === undefined) return
  const userId = session.getUserId()
  const user = await fetchUserWithSupertokens(userId)
  const organization = await fetchOrganizationForUser(userId)

  removeUnserializableFields(user.userProfile)
  let serializableOrg = null
  if (organization !== null) {
    serializableOrg = removeDateFields(organization)
  }
  return {
    props: {
      user,
      userId,
      organization: serializableOrg
    }
  }
}

interface PaybuttonsProps {
  user: UserWithSupertokens
  userId: string
  organization: Organization
}

export default function Payments ({ user, userId, organization }: PaybuttonsProps): React.ReactElement {
  const timezone = user?.userProfile.preferredTimezone === '' ? moment.tz.guess() : user?.userProfile?.preferredTimezone
  const [selectedCurrencyCSV, setSelectedCurrencyCSV] = useState<string>('')
  const [paybuttonNetworks, setPaybuttonNetworks] = useState<Set<number>>(new Set())
  const [transactionYears, setTransactionYears] = useState<number[]>([])
  const [selectedTransactionYears, setSelectedTransactionYears] = useState<number[]>([])

  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [buttons, setButtons] = useState<any[]>([])
  const [selectedButtonIds, setSelectedButtonIds] = useState<any[]>([])
  const [showFilters, setShowFilters] = useState<boolean>(false)
  const [tableLoading, setTableLoading] = useState<boolean>(true)
  const [refreshCount, setRefreshCount] = useState(0)
  const [invoiceData, setInvoiceData] = useState<InvoiceWithTransaction | null>(null)
  const [invoiceDataTransaction, setInvoiceDataTransaction] = useState<TransactionWithAddressAndPricesAndInvoices | null >(null)
  const [invoiceMode, setInvoiceMode] = useState<'create' | 'edit' | 'view'>('create')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const fetchNextInvoiceNumberByUserId = async (): Promise<string> => {
    const response = await fetch('/api/invoices/invoiceNumber/', {
      headers: {
        Timezone: timezone
      }
    })
    const result = await response?.json()
    return result?.invoiceNumber
  }
  const handleCloseModal = (): void => {
    setIsModalOpen(false)
    setInvoiceData(null)
    setRefreshCount(prev => prev + 1)
  }

  const todayDateString = moment().format(HUMAN_READABLE_DATE_FORMAT)

  const onCreateInvoice = async (transaction: TransactionWithAddressAndPricesAndInvoices): Promise<void> => {
    const nextInvoiceNumber = await fetchNextInvoiceNumberByUserId()
    const now = new Date()
    const invoiceData = {
      invoiceNumber: nextInvoiceNumber ?? '',
      amount: transaction.amount,
      recipientName: '',
      recipientAddress: transaction.address ?? '',
      description: '',
      customerName: organization?.name ?? '',
      customerAddress: '',
      userId: '',
      transaction,
      transactionId: transaction.id,
      createdAt: now,
      updatedAt: now,
      id: ''
    }
    setInvoiceDataTransaction(transaction)
    setInvoiceData(invoiceData)
    setInvoiceMode('create')
    setIsModalOpen(true)
  }

  const onEditInvoice = (invoiceData: InvoiceWithTransaction): void => {
    setInvoiceData(invoiceData)
    setInvoiceMode('edit')
    setIsModalOpen(true)
  }

  const onViewInvoice = (invoiceData: InvoiceWithTransaction): void => {
    setInvoiceData(invoiceData)
    setInvoiceMode('view')
    setIsModalOpen(true)
  }
  useEffect(() => {
    setRefreshCount(prev => prev + 1)
  }, [selectedButtonIds, selectedTransactionYears, endDate])

  const fetchPaybuttons = async (): Promise<any> => {
    const res = await fetch(`/api/paybuttons?userId=${user?.userProfile.id}`, {
      method: 'GET'
    })
    if (res.status === 200) {
      return await res.json()
    }
  }

  const fetchTransactionYears = async (): Promise<any> => {
    const res = await fetch('/api/transaction/years', {
      method: 'GET'
    })
    if (res.status === 200) {
      const data = await res.json()
      return data.years
    } else {
      console.error('Failed to fetch transaction years:', res.statusText)
      return []
    }
  }
  const getDataAndSetUpCurrencyCSV = async (): Promise<void> => {
    const paybuttons = await fetchPaybuttons()
    const years = await fetchTransactionYears()
    const networkIds: Set<number> = new Set()
    setButtons(paybuttons)

    paybuttons.forEach((p: { addresses: any[] }) => {
      return p.addresses.forEach((c: { address: { networkId: number } }) => networkIds.add(c.address.networkId))
    })

    setPaybuttonNetworks(networkIds)
    setTransactionYears(years)
    setPageLoading(false)
  }

  useEffect(() => {
    void getDataAndSetUpCurrencyCSV()
  }, [])

  const loadData = async (
    page: number,
    pageSize: number,
    orderBy: string,
    orderDesc: boolean
  ): Promise<{ data: [], totalCount: number }> => {
    setTableLoading(true)
    try {
      // Build the URL including the filter if any buttons are selected
      let url = `/api/payments?page=${page}&pageSize=${pageSize}&orderBy=${orderBy}&orderDesc=${String(orderDesc)}`
      if (selectedButtonIds.length > 0) {
        url += `&buttonIds=${selectedButtonIds.join(',')}`
      }
      if (selectedTransactionYears.length > 0) {
        url += `&years=${selectedTransactionYears.join(',')}`
      }
      if (startDate !== '') {
        url += `&startDate=${startDate}`
      }
      if (endDate !== '') {
        url += `&endDate=${endDate}`
      }

      let paymentsCountUrl = '/api/payments/count'
      if (selectedButtonIds.length > 0) {
        paymentsCountUrl += `?buttonIds=${selectedButtonIds.join(',')}`
      }
      if (selectedTransactionYears.length > 0) {
        paymentsCountUrl += `${paymentsCountUrl.includes('?') ? '&' : '?'}years=${selectedTransactionYears.join(',')}`
      }
      if (startDate !== '') {
        paymentsCountUrl += `${paymentsCountUrl.includes('?') ? '&' : '?'}startDate=${startDate}`
      }
      if (endDate !== '') {
        paymentsCountUrl += `${paymentsCountUrl.includes('?') ? '&' : '?'}endDate=${endDate}`
      }

      const paymentsResponse = await fetch(url, {
        headers: {
          Timezone: timezone
        }
      })

      const paymentsCountResponse = await fetch(
        paymentsCountUrl,
        { headers: { Timezone: timezone } }
      )

      if (!paymentsResponse.ok || !paymentsCountResponse.ok) {
        console.log('paymentsResponse status', paymentsResponse.status)
        console.log('paymentsResponse status text', paymentsResponse.statusText)
        console.log('paymentsResponse body', paymentsResponse.body)
        console.log('paymentsResponse json', await paymentsResponse.json())
        throw new Error('Failed to fetch payments or count')
      }

      const totalCount = await paymentsCountResponse.json()
      const payments = await paymentsResponse.json()

      return { data: payments, totalCount }
    } catch (error) {
      console.error('Error fetching payments:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        Header: 'Date',
        accessor: 'timestamp',
        Cell: (cellProps) => {
          return <div className='table-date'>{moment(cellProps.cell.value * 1000).tz(timezone).format('lll')}</div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'right' }}>Amount</div>),
        accessor: 'amount',
        sortType: compareNumericString,
        Cell: (cellProps) => {
          const { networkId, amount } = cellProps.cell.row.original
          const networkTicker = NETWORK_TICKERS_FROM_ID[networkId]
          const formattedAmount = Number(amount).toLocaleString(undefined, {
            minimumFractionDigits: DECIMALS[networkTicker],
            maximumFractionDigits: DECIMALS[networkTicker]
          })

          return <div style={{ textAlign: 'right', fontWeight: '600' }}>{formattedAmount}</div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'right' }}>Value</div>),
        accessor: 'values',
        sortType: compareNumericString,
        disableSortBy: true,
        Cell: (cellProps) => {
          return <div style={{ textAlign: 'right', fontWeight: '600' }}> ${formatQuoteValue(cellProps.cell.value, user.userProfile.preferredCurrencyId)}</div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'center' }}>Network</div>),
        accessor: 'networkId',
        Cell: (cellProps) => {
          return (
            <div className='table-icon-ctn'>
              <div className='table-icon'>
              {cellProps.cell.value === XEC_NETWORK_ID ? <Image src={XECIcon} alt='XEC' /> : <Image src={BCHIcon} alt='BCH' />}
              </div>
            </div>
          )
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'center' }}>Buttons</div>),
        accessor: 'buttonDisplayDataList',
        Cell: (cellProps) => {
          return (
            <div className='payments-btn-cell'>
              {cellProps.cell.value.map((buttonDisplayData: ButtonDisplayData) =>
                buttonDisplayData.providerUserId === userId
                  ? (
                  <div style={{ textAlign: 'center' }} className="table-button" key={buttonDisplayData.id}>
                    <Link href={`/button/${buttonDisplayData.id}`}>{buttonDisplayData.name}</Link>
                  </div>
                    )
                  : null
              )}
            </div>
          )
        }
      },
      {
        Header: 'TX',
        accessor: 'hash',
        disableSortBy: true,
        Cell: (cellProps) => {
          const url = cellProps.cell.row.values.networkId === XEC_NETWORK_ID ? XEC_TX_EXPLORER_URL : BCH_TX_EXPLORER_URL
          return (
            <a href={url.concat(cellProps.cell.value)} target="_blank" rel="noopener noreferrer" className="table-eye-ctn">
              <div className="table-eye">
                <Image src={EyeIcon} alt='View on explorer' />
              </div>
            </a>
          )
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'center' }}>Invoice</div>),
        id: 'actions',
        disableSortBy: true,
        Cell: (cellProps) => {
          const transaction = cellProps.row.original
          const invoices = transaction.invoices ?? []
          const hasInvoice = invoices.filter(i => i !== null).length > 0
          let invoice = {} as InvoiceWithTransaction
          if (hasInvoice) {
            invoice = {
              transaction,
              ...transaction.invoices[0]
            }
          }

          return (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {!hasInvoice
                ? (
                <div className={style.create_invoice_ctn}>
                  <button
                    onClick={() => {
                      onCreateInvoice(transaction).catch(console.error)
                    }}
                    title="Create Invoice"
                    className={style.create_invoice}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >

                    <Image src={Plus} alt='create invoice' width={14} height={14} />
                  </button>
                  <div className={style.tooltiptext}>New Invoice</div>
                </div>
                  )
                : (
                <>
                  <div className={style.edit_invoice_ctn}>
                    <button
                      onClick={() => onEditInvoice(invoice)}
                      title="Edit Invoice"
                      className={style.edit_invoice}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
                    >
                      <Image src={Pencil} alt='edit invoice' width={16} height={16} />
                    </button>
                  </div>
                  <div className={style.view_invoice_ctn}>
                    <button
                      onClick={() => onViewInvoice(invoice)}
                      title="View Invoice"
                      className={style.view_invoice}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
                    >
                      <Image src={FileText} alt='see invoice' width={16} height={16} />

                    </button>
                  </div>
                </>
                  )}
            </div>
          )
        }
      }
    ],
    []
  )

  const downloadCSV = async (userId: string, userProfile: UserProfile, currency: string): Promise<void> => {
    try {
      setLoading(true)
      const preferredCurrencyId = userProfile?.preferredCurrencyId ?? ''
      let url = `/api/payments/download/?currency=${preferredCurrencyId}`
      if (selectedButtonIds.length > 0) {
        url += `&buttonIds=${selectedButtonIds.join(',')}`
      }
      if (selectedTransactionYears.length > 0) {
        url += `&years=${selectedTransactionYears.join(',')}`
      }
      if (startDate !== '') {
        url += `&startDate=${startDate}`
      }
      if (endDate !== '') {
        url += `&endDate=${endDate}`
      }

      const isCurrencyEmptyOrUndefined = (value: string): boolean => (value === '' || value === undefined)
      if (!isCurrencyEmptyOrUndefined(currency)) {
        url += `&network=${currency}`
      }

      const response = await fetch(url, {
        headers: {
          Timezone: timezone
        }
      })

      if (!response.ok) {
        throw new Error('Failed to download CSV')
      }

      const selectedButtonNames = buttons
        .filter(btn => selectedButtonIds.includes(btn.id))
        .map(btn => btn.name.replace(/\s+/g, '-'))
        .join('_')

      const buttonSuffix = selectedButtonIds.length > 0
        ? `-${selectedButtonNames !== '' ? selectedButtonNames : 'filtered'}`
        : ''
      const currencyLabel = isCurrencyEmptyOrUndefined(currency) ? 'all' : currency.toLowerCase()
      const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss')

      const fileName = `${currencyLabel}-transactions${buttonSuffix}-${timestamp}`
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
      setSelectedCurrencyCSV('')
    }
  }

  const handleExport = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const currencyParam = event.target.value !== 'all' ? event.target.value : ''
    setSelectedCurrencyCSV(currencyParam)
    void downloadCSV(userId, user?.userProfile, currencyParam)
  }
  const handleClearFilters = (): void => {
    setSelectedButtonIds([])
    setSelectedTransactionYears([])
    setStartDate('')
    setEndDate('')
  }

  if (pageLoading) {
    return (
      <>
        <TopBar title="Payments" user={user?.stUser?.email} />
        <Loading />
      </>
    )
  }

  return (
    <>
      <TopBar title="Payments" user={user?.stUser?.email} />
      <div className={style.filters_export_ctn}>
        <div className={style.filter_btns}>
          <div
            onClick={() => setShowFilters(!showFilters)}
            className={`${style.show_filters_button} ${selectedButtonIds.length > 0 ? style.active : ''}`}
          >
            <Image src={SettingsIcon} alt="filters" width={15} />Filters
          </div>
          {(selectedButtonIds.length > 0 || selectedTransactionYears.length > 0 || startDate !== '' || endDate !== '') &&
          <div
          onClick={() => handleClearFilters()}
          className={style.show_filters_button}
        >
          Clear
        </div>
          }
        </div>
      {paybuttonNetworks.size > 1
        ? (
              <select
                id='export-btn'
                value={selectedCurrencyCSV}
                onChange={handleExport}
                className="select_button"
              >
                <option value='' disabled>{loading ? 'Downloading...' : 'Export as CSV'}</option>
                <option key="all" value="all">
                  {loading ? 'Downloading...' : 'All Currencies'}
                </option>
                {Object.entries(NETWORK_TICKERS_FROM_ID)
                  .filter(([id]) => paybuttonNetworks.has(Number(id)))
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
                variant='small'
                disabled={loading}
                loading={loading}
              >
                Export as CSV
              </Button>)}
      </div>
      {showFilters && (
        <div>
            <div className={style.showfilters_ctn}>
              <span>Filter by button</span>
              <div className={style.filters_ctn}>
                {buttons.map((button) => (
                  <div
                    key={button.id}
                    onClick={() => {
                      setSelectedButtonIds(prev =>
                        prev.includes(button.id)
                          ? prev.filter(id => id !== button.id)
                          : [...prev, button.id]
                      )
                    }}
                    className={`${style.filter_button} ${selectedButtonIds.includes(button.id) ? style.active : ''}`}
                  >
                    {button.name}
                  </div>
                ))}
              </div>
            </div>
            <div className={style.showfilters_ctn}>
            <span>Filter by year</span>
              <div className={style.filters_ctn}>
                {transactionYears.map((y) => (
                  <div
                    key={y}
                    onClick={() => {
                      setSelectedTransactionYears(prev => {
                        const newYears = prev.includes(y)
                          ? prev.filter(year => year !== y)
                          : [...prev, y]

                        if (newYears.length > 0) {
                          setStartDate('')
                          setEndDate('')
                        }
                        return newYears
                      })
                    }}
                    className={`${style.filter_button} ${selectedTransactionYears.includes(y) ? style.active : ''}`}
                  >
                    {y}
                  </div>
                ))}
              </div>
            </div>
          <div className={style.showfilters_ctn}>
            <span>Filter by date range</span>
            <div className={style.filters_ctn} style={{ alignItems: 'center' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const newStartDate = e.target.value
                  setStartDate(newStartDate)
                  if (newStartDate !== '') {
                    setSelectedTransactionYears([])
                  }
                  setEndDate('')
                }}
                className={style.filter_input}
                max={todayDateString}
              />
              <span style={{ margin: '0 8px' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  const newEndDate = e.target.value
                  setEndDate(newEndDate)
                  if (newEndDate !== '') {
                    setSelectedTransactionYears([])
                  }
                }}
                min={startDate !== '' ? startDate : undefined}
                max={todayDateString}
                className={style.filter_input}
              />
            </div>
          </div>
        </div>
      )}
      <TableContainerGetter
        columns={columns}
        dataGetter={async (page, pageSize, orderBy, orderDesc) =>
          await loadData(page, pageSize, orderBy, orderDesc)
        }
        tableRefreshCount={refreshCount}
        emptyMessage={tableLoading ? 'Loading...' : 'No Payments to show yet'}
        />
      <InvoiceModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        invoiceData={invoiceData}
        mode={invoiceMode}
        transaction={invoiceDataTransaction}
        />
    </>
  )
}
