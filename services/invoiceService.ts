import prisma from 'prisma/clientInstance'
import { Invoice } from '@prisma/client'
import { RESPONSE_MESSAGES } from 'constants/index'

interface CreateInvoiceParams {
  userId: string
  transactionId: string
  amount: number
  description: string
  recipientName: string
  recipientAddress: string
  customerName: string
  customerAddress: string
}

export async function createInvoice (params: CreateInvoiceParams): Promise<Invoice> {
  const year = new Date().getFullYear()

  const latestInvoiceNumber = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: `${year}-`
      }
    },
    orderBy: {
      invoiceNumber: 'desc'
    }
  })
  const nextNumber = (latestInvoiceNumber != null) ? parseInt(latestInvoiceNumber.invoiceNumber.split('-')[1]) + 1 : 1

  const invoiceNumber = `${year}-${String(nextNumber).padStart(3, '0')}`

  return await prisma.invoice.create({
    data: {
      invoiceNumber,
      ...params
    }
  })
}

export async function getInvoices (userId: string): Promise<Invoice[]> {
  return await prisma.invoice.findMany({
    where: {
      userId
    }
  })
}

export async function getInvoiceByTransactionId (transactionId: string, userId: string): Promise<Invoice | null> {
  const invoice = await prisma.invoice.findFirst({
    where: {
      transactionId,
      userId
    }
  })
  if (invoice === null) {
    throw new Error(RESPONSE_MESSAGES.NO_INVOICE_FOUND_404.message)
  }

  return invoice
}
