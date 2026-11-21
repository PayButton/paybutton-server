import prisma from 'prisma-local/clientInstance'
import { v4 as uuidv4 } from 'uuid'
import { multiBlockchainClient } from 'services/chronikService'
import { Prisma, ClientPaymentStatus } from '@prisma/client'
import { NETWORK_IDS_FROM_SLUGS, CLIENT_PAYMENT_EXPIRATION_TIME } from 'constants/index'
import { parseAddress } from 'utils/validators'
import { addressExists } from './addressService'
import moment from 'moment'

export interface ClientPaymentField {
  name: string
  text?: string
  type?: string
  value?: string | boolean
}

export const generatePaymentId = async (address: string, amount?: Prisma.Decimal, fields?: ClientPaymentField[]): Promise<string> => {
  const rawUUID = uuidv4()
  const cleanUUID = rawUUID.replace(/-/g, '')
  const status = 'PENDING' as ClientPaymentStatus
  address = parseAddress(address)
  const prefix = address.split(':')[0].toLowerCase()
  const networkId = NETWORK_IDS_FROM_SLUGS[prefix]
  const isAddressRegistered = await addressExists(address)

  const clientPayment = await prisma.clientPayment.create({
    data: {
      address: {
        connectOrCreate: {
          where: { address },
          create: {
            address,
            networkId
          }
        }
      },
      paymentId: cleanUUID,
      status,
      amount,
      fields: fields !== undefined ? JSON.stringify(fields) : '[]'
    },
    include: {
      address: true
    }
  })

  if (!isAddressRegistered) {
    void multiBlockchainClient.syncAndSubscribeAddresses([clientPayment.address])
  }

  return clientPayment.paymentId
}

export const updateClientPaymentStatus = async (paymentId: string, status: ClientPaymentStatus): Promise<void> => {
  await prisma.clientPayment.update({
    where: { paymentId },
    data: { status }
  })
}

export const getClientPayment = async (paymentId: string): Promise<Prisma.ClientPaymentGetPayload<{ include: { address: true } }> | null> => {
  return await prisma.clientPayment.findUnique({
    where: { paymentId },
    include: { address: true }
  })
}

export const getClientPaymentFields = async (paymentId: string): Promise<ClientPaymentField[]> => {
  const clientPayment = await prisma.clientPayment.findUnique({
    where: { paymentId },
    select: { fields: true }
  })
  if (clientPayment === null) {
    return []
  }
  try {
    return JSON.parse(clientPayment.fields) as ClientPaymentField[]
  } catch {
    return []
  }
}

export const updateClientPaymentFields = async (paymentId: string, fields: ClientPaymentField[]): Promise<void> => {
  await prisma.clientPayment.update({
    where: { paymentId },
    data: { fields: JSON.stringify(fields) }
  })
}

export const cleanupExpiredClientPayments = async (): Promise<void> => {
  const cutoff = moment.utc().subtract(CLIENT_PAYMENT_EXPIRATION_TIME, 'milliseconds').toDate()

  const oldPaymentsUnpaid = await prisma.clientPayment.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: cutoff }
    },
    select: { paymentId: true }
  })

  if (oldPaymentsUnpaid.length === 0) {
    console.log('[CLIENT_PAYMENT CLEANUP] no expired pending payments found.')
    return
  }

  console.log(`[CLIENT_PAYMENT CLEANUP] deleting ${oldPaymentsUnpaid.length} expired pending payments...`)
  await prisma.clientPayment.deleteMany({
    where: {
      paymentId: { in: oldPaymentsUnpaid.map(p => p.paymentId) }
    }
  })
}
