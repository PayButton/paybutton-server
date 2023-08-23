import { PaybuttonTrigger } from '@prisma/client'
import { RESPONSE_MESSAGES } from 'constants/index'
import prisma from 'prisma/clientInstance'
import { fetchPaybuttonById } from './paybuttonService'

export interface CreatePaybuttonTriggerInput {
  userId: string
  sendEmail: boolean
  postURL?: string
  postData?: string
}

export async function createTrigger (paybuttonId: string, values: CreatePaybuttonTriggerInput): Promise<PaybuttonTrigger> {
  const paybutton = await fetchPaybuttonById(paybuttonId)
  if (paybutton.providerUserId !== values.userId) {
    throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
  }
  return await prisma.paybuttonTrigger.create({
    data: {
      paybuttonId,
      sendEmail: values.sendEmail,
      postURL: values.postURL ?? '',
      postData: values.postData ?? ''
    }
  })
}
