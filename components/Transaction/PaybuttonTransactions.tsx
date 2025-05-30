import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import EyeIcon from 'assets/eye-icon.png'
import CheckIcon from 'assets/check-icon.png'
import XIcon from 'assets/x-icon.png'
import { Plus, Pencil, FileText } from 'lucide-react'
import TableContainerGetter from '../TableContainer/TableContainerGetter'
import { compareNumericString } from 'utils/index'
import moment from 'moment-timezone'
import { XEC_TX_EXPLORER_URL, BCH_TX_EXPLORER_URL } from 'constants/index'
import InvoiceModal from './InvoiceModal'
import style from './transaction.module.css'

interface IProps {
  addressSyncing: {
    [address: string]: boolean
  }
  paybuttonId: string
  tableRefreshCount: number
  timezone: string
}

function fetchTransactionsByPaybuttonId (paybuttonId: string): Function {
  return async (page: number, pageSize: number, orderBy: string, orderDesc: boolean) => {
    const response = await fetch(`/api/paybutton/transactions/${paybuttonId}?page=${page}&pageSize=${pageSize}&orderBy=${orderBy}&orderDesc=${String(orderDesc)}`, {
      headers: {
        Timezone: moment.tz.guess()
      }
    })
    const responseCount = await fetch(`/api/paybutton/transactions/count/${paybuttonId}`)
    const transactions = await response.json()
    const count = await responseCount.json()
    return {
      data: transactions.transactions,
      totalCount: count
    }
  }
}

interface InvoiceData {
  invoiceNumber: string
  amount: number
  recipientName: string
  recipientAddress: string
  description: string
  customerName: string
  customerAddress: string
}

const fetchNextInvoiceNumberByUserId = async (): Promise<string> => {
  const response = await fetch('/api/invoices/invoiceNumber/', {
    headers: {
      Timezone: moment.tz.guess()
    }
  })
  const result = await response?.json()
  return result?.invoiceNumber
}

export default ({ paybuttonId, addressSyncing, tableRefreshCount, timezone = moment.tz.guess() }: IProps): JSX.Element => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null)
  const [invoiceDataTransaction, setInvoiceDataTransaction] = useState(null)
  const [localRefreshCount, setLocalRefreshCount] = useState(tableRefreshCount)

  const [invoiceMode, setInvoiceMode] = useState<'create' | 'edit' | 'view'>('create')

  const onCreateInvoice = async (transaction: any): Promise<void> => {
    const nextInvoiceNumber = await fetchNextInvoiceNumberByUserId()
    const invoiceData = {
      invoiceNumber: nextInvoiceNumber ?? '',
      amount: transaction.amount,
      recipientName: '',
      recipientAddress: transaction.address.address,
      description: '',
      customerName: '',
      customerAddress: ''
    }
    setInvoiceDataTransaction(transaction)
    setInvoiceData(invoiceData)
    setInvoiceMode('create')
    setIsModalOpen(true)
  }

  const onEditInvoice = (transaction: any): void => {
    setInvoiceData(transaction.invoices[0])
    setInvoiceMode('edit')
    setIsModalOpen(true)
  }

  const onSeeInvoice = (transaction: any): void => {
    setInvoiceData(transaction.invoices[0])
    setInvoiceMode('view')
    setIsModalOpen(true)
  }

  const handleCloseModal = (): void => {
    setIsModalOpen(false)
    setInvoiceData(null)
    setLocalRefreshCount(prev => prev + 1)
  }
  const columns = useMemo(
    () => [
      {
        Header: 'Confirmed',
        accessor: 'confirmed',
        Cell: (cellProps) => {
          return <div className='table-conf-icon'>{cellProps.cell.value === true ? <Image src={CheckIcon} alt='confirmed' /> : <Image src={XIcon} alt='unconfirmed' />}</div>
        }
      },
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
          return <div style={{ textAlign: 'right', fontWeight: '600' }}>{parseFloat(cellProps.cell.value).toLocaleString(
            undefined,
            {
              minimumFractionDigits: cellProps.row.values['address.networkId'] === 1 ? 2 : 8,
              maximumFractionDigits: cellProps.row.values['address.networkId'] === 1 ? 2 : 8
            }
          )
            } {cellProps.row.values['address.networkId'] === 1 ? 'XEC' : 'BCH' }</div>
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'center' }}>Network</div>),
        accessor: 'address.networkId',
        Cell: (cellProps) => {
          return (
            <div className='table-icon-ctn'>
              <div className='table-icon'>
              {cellProps.cell.value === 1 ? <Image src={XECIcon} alt='XEC' /> : <Image src={BCHIcon} alt='BCH' />}
              </div>
            </div>
          )
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'center' }}>TX</div>),
        accessor: 'hash',
        disableSortBy: true,
        Cell: (cellProps) => {
          const url = cellProps.cell.row.values['address.networkId'] === 1 ? XEC_TX_EXPLORER_URL : BCH_TX_EXPLORER_URL
          return (
            <div className="table-eye-ctn">
              <a href={url.concat(cellProps.cell.value)} target="_blank" rel="noopener noreferrer">
                <div className="table-eye">
                  <Image src={EyeIcon} alt='View on explorer' />
                </div>
              </a>
            </div>
          )
        }
      },
      {
        Header: () => (<div style={{ textAlign: 'center' }}>Actions</div>),
        id: 'actions',
        Cell: (cellProps) => {
          const invoices = cellProps.row.original.invoices
          const hasInvoice = invoices?.length > 0

          return (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {!hasInvoice
                ? (
                <div className={style.create_invoice_ctn}>
                  <button
                    onClick={() => {
                      onCreateInvoice(cellProps.row.original).catch(console.error)
                    }}
                    title="Create Invoice"
                    className={style.create_invoice}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <Plus size={18} />
                  </button>
                  <div className={style.tooltiptext}>New button</div>
                </div>
                  )
                : (
                <>
                  <button
                    onClick={() => onEditInvoice(cellProps.row.original)}
                    title="Edit Invoice"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => onSeeInvoice(cellProps.row.original)}
                    title="See Invoice"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
                  >
                    <FileText size={18} />
                  </button>
                </>
                  )}
            </div>
          )
        }
      },
      {
        Header: () => (<div style={{ marginRight: '1px' }}>Address</div>),
        accessor: 'address.address',
        shrinkable: true,
        Cell: (cellProps) => {
          return (
            <div>
              {cellProps.cell.value}
            </div>
          )
        }
      }

    ],
    []
  )
  return (
    <>
      <TableContainerGetter columns={columns} dataGetter={fetchTransactionsByPaybuttonId(paybuttonId)} tableRefreshCount={localRefreshCount} emptyMessage={'No transactions.'}/>
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
