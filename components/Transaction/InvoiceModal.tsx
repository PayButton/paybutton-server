import React, { useState, useEffect, ReactElement } from 'react'
import style from './transaction.module.css'
import Button from 'components/Button'
import { CreateInvoicePOSTParameters } from 'utils/validators'
import axios from 'axios'

export interface InvoiceData {
  id?: string
  invoiceNumber: string
  amount: number
  recipientName: string
  recipientAddress: string
  description: string
  customerName: string
  customerAddress: string
}

interface InvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: any
  invoiceData: InvoiceData | null
  mode: 'create' | 'edit' | 'view'
}

export default function InvoiceModal ({
  isOpen,
  onClose,
  invoiceData,
  transaction,
  mode
}: InvoiceModalProps): ReactElement | null {
  const [formData, setFormData] = useState<InvoiceData>({
    invoiceNumber: '',
    amount: Number(transaction?.amount),
    recipientName: '',
    recipientAddress: transaction?.address?.address,
    description: '',
    customerName: '',
    customerAddress: ''
  })

  useEffect(() => {
    setFormData(invoiceData ?? {
      invoiceNumber: '',
      amount: Number(transaction?.amount),
      recipientName: '',
      recipientAddress: transaction?.address?.address,
      description: '',
      customerName: '',
      customerAddress: ''
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
      amount: 0,
      recipientName: '',
      recipientAddress: '',
      description: '',
      customerName: '',
      customerAddress: ''
    })
    onClose()
  }

  async function handleSubmit (e: React.FormEvent): Promise<void> {
    e.preventDefault()

    if (mode === 'edit') {
      await updateInvoice()
    } else {
      await createInvoice()
    }
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
                <label htmlFor="amount">Amount</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount ?? ''}
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
                    <Button type="button" onClick={handleModalClose}>
                    {isReadOnly ? 'Close' : 'Cancel'}
                    </Button>
                </div>
                {!isReadOnly && (
                <div className="mt-2">
                    <Button type="submit">Submit</Button>
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
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="button" onClick={handleModalClose}>Close</Button>
            </div>
          </div>
                 }
        </div>
      </div>
    </div>
  )
}
