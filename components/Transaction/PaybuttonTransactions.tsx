import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import EyeIcon from 'assets/eye-icon.png'
import CheckIcon from 'assets/check-icon.png'
import XIcon from 'assets/x-icon.png'
import Plus from 'assets/plus.png'
import Pencil from 'assets/pencil.png'
import FileText from 'assets/file-text.png'

import TableContainerGetter, { DataGetterReturn } from '../TableContainer/TableContainerGetter'
import { compareNumericString } from 'utils/index'
import moment from 'moment-timezone'
import { XEC_TX_EXPLORER_URL, BCH_TX_EXPLORER_URL } from 'constants/index'
import InvoiceModal, { InvoiceData } from './InvoiceModal'
import style from './transaction.module.css'
import { TransactionWithAddressAndPricesAndInvoices } from 'services/transactionService'

interface IProps {
  addressSyncing: {
    [address: string]: boolean
  }
  paybuttonId: string
  tableRefreshCount: number
  timezone: string
}

function fetchTransactionsByPaybuttonId (paybuttonId: string): (page: number, pageSize: number, orderBy: string, orderDesc: boolean) => Promise<DataGetterReturn> {
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
  const [invoiceDataTransaction, setInvoiceDataTransaction] = useState<TransactionWithAddressAndPricesAndInvoices | null >(null)
  const [localRefreshCount, setLocalRefreshCount] = useState(tableRefreshCount)
  const [invoiceMode, setInvoiceMode] = useState<'create' | 'edit' | 'view'>('create')

  const onCreateInvoice = async (transaction: TransactionWithAddressAndPricesAndInvoices): Promise<void> => {
    const nextInvoiceNumber = await fetchNextInvoiceNumberByUserId()
    const invoiceData = {
      invoiceNumber: nextInvoiceNumber ?? '',
      amount: Number(transaction.amount),
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

  const onEditInvoice = (invoiceData: InvoiceData): void => {
    delete invoiceData.transactionHash
    delete invoiceData.transactionDate
    delete invoiceData.transactionNetworkId

    setInvoiceData(invoiceData)
    setInvoiceMode('edit')
    setIsModalOpen(true)
  }

  const onSeeInvoice = (invoiceData: InvoiceData): void => {
    setInvoiceData(invoiceData)
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
      },
      {
        Header: () => (<div style={{ textAlign: 'center' }}>Actions</div>),
        id: 'actions',
        Cell: (cellProps) => {
          const transaction = cellProps.row.original
          const hasInvoice = transaction.invoices?.length > 0
          let invoice = {} as InvoiceData
          if (hasInvoice) {
            invoice = {
              transactionHash: transaction.hash,
              transactionDate: transaction.timestamp,
              transactionNetworkId: transaction.address.networkId,
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
                  <div className={style.tooltiptext}>New button</div>
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
                  <div className={style.see_invoice_ctn}>
                    <button
                      onClick={() => onSeeInvoice(invoice)}
                      title="See Invoice"
                      className={style.see_invoice}
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
