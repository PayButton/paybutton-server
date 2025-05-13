import prisma from 'prisma/clientInstance'
import { Invoice } from '@prisma/client'
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
