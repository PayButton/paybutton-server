import React, { useState, useEffect, ReactElement, useRef } from 'react'
import style from './transaction.module.css'
import Button from 'components/Button'
import { CreateInvoicePOSTParameters } from 'utils/validators'
import axios from 'axios'
import { Prisma } from '@prisma/client'
import { useReactToPrint } from 'react-to-print'
import PrintableReceipt from './Invoice'
import XECIcon from 'assets/xec-logo.png'
import BCHIcon from 'assets/bch-logo.png'
import { XEC_NETWORK_ID } from 'constants/index'
import Image from 'next/image'
import { InvoiceWithTransaction } from 'services/invoiceService'

interface InvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: any
  invoiceData: InvoiceWithTransaction | null
  mode: 'create' | 'edit' | 'view'
}

export default function InvoiceModal ({
  isOpen,
  onClose,
  invoiceData,
  transaction,
  mode
}: InvoiceModalProps): ReactElement | null {
  const contentRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef,
    onBeforePrint: async () => {
      return await new Promise<void>((resolve) => {
        setLoading(true)
        setTimeout(() => {
          setLoading(false)
          resolve()
        }, 1000)
      })
    }
  })

  const [formData, setFormData] = useState<InvoiceWithTransaction>({
    id: '',
    invoiceNumber: '',
    amount: transaction?.amount ?? new Prisma.Decimal(0),
    recipientName: '',
    recipientAddress: transaction?.address ?? '',
    description: '',
    customerName: '',
    customerAddress: '',
    userId: transaction?.userId ?? '',
    transaction: transaction ?? null,
    transactionId: transaction?.id ?? null,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    setFormData(invoiceData ?? {
      invoiceNumber: '',
      amount: transaction?.amount,
      recipientName: '',
      recipientAddress: transaction?.address,
      description: '',
      customerName: '',
      customerAddress: '',
      userId: transaction?.userId ?? '',
      transaction: transaction ?? null,
      transactionId: transaction?.id ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      id: ''
    })
  }, [transaction, mode, invoiceData])

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleModalClose = (): void => {
    setFormData({
      invoiceNumber: '',
      amount: new Prisma.Decimal(0),
      recipientName: '',
      recipientAddress: '',
      description: '',
      customerName: '',
      customerAddress: '',
      userId: transaction?.userId ?? '',
      transaction: transaction ?? null,
      transactionId: transaction?.id ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      id: ''
    })
    onClose()
  }

  async function handleSubmit (e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setLoading(true)
    if (mode === 'edit') {
      await updateInvoice()
    } else {
      await createInvoice()
    }
    setLoading(false)
    onClose()
  }

  async function createInvoice (): Promise<void> {
    const payload: CreateInvoicePOSTParameters = {
      ...formData,
      transactionId: transaction?.id
    }

    try {
      await axios.post('/api/invoices', payload)
    } catch (err: any) {
      console.error('Invoice submission error:', err)
    }
  }

  async function updateInvoice (): Promise<void> {
    const payload: CreateInvoicePOSTParameters = {
      ...formData,
      transactionId: transaction?.id
    }

    try {
      await axios.put(`/api/invoices/?invoiceId=${invoiceData?.id ?? ''}`, payload)
      onClose()
    } catch (err: any) {
      console.error('Invoice update error:', err)
    }
  }
  const isReadOnly = mode === 'view'

  return (
    <div className={style.form_ctn_outer}>
      <div className={style.form_ctn_inner}>
        <h4>{mode === 'edit' ? 'Edit Invoice' : mode === 'view' ? 'View Invoice' : 'Create Invoice'}</h4>
        <div className={style.form_ctn}>
        {!isReadOnly
          ? <form onSubmit={(e) => {
            void handleSubmit(e)
          }} method="post">
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <label htmlFor="invoiceNumber">Invoice Number</label>
                <input
                  type="text"
                  id="invoiceNumber"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <label htmlFor="amount">Amount</label>
                  <div className='table-icon'>
                  { transaction.networkId === XEC_NETWORK_ID ? <Image src={XECIcon} alt='XEC' /> : <Image src={BCHIcon} alt='BCH' />}
                  </div>
                </div>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={Number(formData.amount) ?? ''}
                  onChange={handleChange}
                  disabled={true}
                />
              </div>
            </div>

            <label htmlFor="recipientName">Recipient Name</label>
            <input
              type="text"
              id="recipientName"
              name="recipientName"
              value={formData.recipientName}
              onChange={handleChange}
            />

            <label htmlFor="recipientAddress">Recipient Address</label>
            <input
              type="text"
              id="recipientAddress"
              name="recipientAddress"
              value={formData.recipientAddress}
              onChange={handleChange}
              disabled={true}
            />

            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
            ></textarea>

            <label htmlFor="customerName">Customer Name</label>
            <input
              type="text"
              id="customerName"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              disabled={isReadOnly}
            />

            <label htmlFor="customerAddress">Customer Address</label>
            <input
              type="text"
              id="customerAddress"
              name="customerAddress"
              value={formData.customerAddress}
              onChange={handleChange}
              disabled={isReadOnly}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                <div className="mt-2">
                    <Button type="button" onClick={handleModalClose} variant="outlined">
                    {isReadOnly ? 'Close' : 'Cancel'}
                    </Button>
                </div>
                {!isReadOnly && (
                <div className="mt-2">
                    <Button type="submit" loading={loading}>Submit</Button>
                </div>
                )}
            </div>
          </form>
          : <div>
            <div className={style.invoice_view}>
              <div className={style.invoice_view_item}>
                <strong>Invoice Number:</strong> {formData.invoiceNumber}
              </div>
              <div className={style.invoice_view_item}>
                <strong>Amount:</strong> {formData.amount}
              </div>
              <div className={style.invoice_view_item}>
                <strong>Recipient Name:</strong> {formData.recipientName}
              </div>
              <div className={style.invoice_view_item}>
                <strong>Recipient Address:</strong> {formData.recipientAddress}
              </div>
              <div className={style.invoice_view_item}>
                <strong>Description:</strong> {formData.description}
              </div>
              <div className={style.invoice_view_item}>
                <strong>Customer Name:</strong> {formData.customerName}
              </div>
              <div className={style.invoice_view_item}>
                <strong>Customer Address:</strong> {formData.customerAddress}
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
              <Button type="button" onClick={handleModalClose} variant="outlined">Cancel</Button>
              <Button type="button" onClick={handlePrint} loading={loading}>Download as PDF</Button>
            </div>
          </div>
                 }
        </div>
        <div style={{ display: 'none' }}>
        {/* <div> */}
          <PrintableReceipt ref={contentRef} data={invoiceData} />
        </div>
      </div>
    </div>
  )
}
