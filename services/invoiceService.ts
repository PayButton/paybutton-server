import prisma from 'prisma/clientInstance'
import { Invoice } from '@prisma/client'
import { RESPONSE_MESSAGES } from 'constants/index'

export interface CreateInvoiceParams {
  userId: string
  transactionId: string
  invoiceNumber: string
  amount: number
  description: string
  recipientName: string
  recipientAddress: string
  customerName: string
  customerAddress: string
}

interface UpdateInvoiceParams {
  description: string
  recipientName: string
  recipientAddress: string
  customerName: string
  customerAddress: string
}

export async function createInvoice (params: CreateInvoiceParams): Promise<Invoice> {
  return await prisma.invoice.create({
    data: {
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

export async function getInvoiceById (invoiceId: string, userId: string): Promise<Invoice | null> {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      userId
    }
  })
  if (invoice === null) {
    throw new Error(RESPONSE_MESSAGES.NO_INVOICE_FOUND_404.message)
  }

  return invoice
}

export async function updateInvoice (userId: string, invoiceId: string, params: UpdateInvoiceParams): Promise<Invoice> {
  const invoice = await getInvoiceById(invoiceId, userId)
  if (invoice === null) {
    throw new Error(RESPONSE_MESSAGES.NO_INVOICE_FOUND_404.message)
  }

  return await prisma.invoice.update({
    where: {
      id: invoice.id
    },
    data: params
  })
}

export async function getNewInvoiceNumber (userId: string): Promise<string | undefined> {
  const year = new Date().getFullYear()
  const defaultPattern = /^\d{4}-\d+$/

  const userInvoices = await prisma.invoice.findMany({
    where: {
      userId
    },
    orderBy: {
      invoiceNumber: 'desc'
    }
  })
  const invoicesWithOurPattern = userInvoices.filter(invoice => defaultPattern.test(invoice.invoiceNumber))

  if (invoicesWithOurPattern === null) {
    const invoicesCount = await prisma.invoice.count({
      where: {
        userId
      }
    })
    if (invoicesCount > 0) {
      return
    }
  }

  const invoiceWithTheLatestInvoiceNumber = invoicesWithOurPattern[0]
  const nextInvoiceNumber = (invoiceWithTheLatestInvoiceNumber != null) ? parseInt(invoiceWithTheLatestInvoiceNumber.invoiceNumber.split('-')[1]) + 1 : 1

  const invoiceNumber = `${year}-${String(nextInvoiceNumber)}`
  return invoiceNumber
}
