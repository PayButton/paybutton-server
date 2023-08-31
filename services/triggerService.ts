import { PaybuttonTrigger, Prisma } from '@prisma/client'
import axios from 'axios'
import { RESPONSE_MESSAGES, NETWORK_TICKERS_FROM_ID } from 'constants/index'
import prisma from 'prisma/clientInstance'
import { parseTriggerPostData, PostDataParameters } from 'utils/validators'
import { BroadcastTxData } from 'ws-service/types'
import { fetchPaybuttonById, fetchPaybuttonWithTriggers } from './paybuttonService'

const triggerWithPaybutton = Prisma.validator<Prisma.PaybuttonTriggerArgs>()({
  include: { paybutton: true }
})

export type TriggerWithPaybutton = Prisma.PaybuttonTriggerGetPayload<typeof triggerWithPaybutton>

export interface DeletePaybuttonTriggerInput {
  userId: string
  triggerId: string
}

export interface UpdatePaybuttonTriggerInput {
  userId: string
  sendEmail: boolean
  postURL?: string
  postData?: string
  triggerId: string
}

export interface CreatePaybuttonTriggerInput {
  userId: string
  sendEmail: boolean
  postURL?: string
  postData?: string
}

export async function fetchTriggersForPaybutton (paybuttonId: string, userId: string): Promise<PaybuttonTrigger[]> {
  const paybutton = await fetchPaybuttonWithTriggers(paybuttonId)
  if (paybutton.providerUserId !== userId) {
    throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
  }
  return paybutton.triggers
}

export async function createTrigger (paybuttonId: string, values: CreatePaybuttonTriggerInput): Promise<PaybuttonTrigger> {
  const paybutton = await fetchPaybuttonWithTriggers(paybuttonId)
  if (paybutton.providerUserId !== values.userId) {
    throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
  }
  if (paybutton.triggers.length !== 0) {
    throw new Error(RESPONSE_MESSAGES.LIMIT_TRIGGERS_PER_BUTTON_400.message)
  }
  if ((await fetchTriggersForPaybuttonAddresses(paybutton.id)).length > 0) {
    throw new Error(RESPONSE_MESSAGES.LIMIT_TRIGGERS_PER_BUTTON_ADDRESSES_400.message)
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

export async function deleteTrigger (paybuttonId: string, values: DeletePaybuttonTriggerInput): Promise<PaybuttonTrigger> {
  const paybutton = await fetchPaybuttonWithTriggers(paybuttonId)
  if (paybutton.providerUserId !== values.userId) {
    throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
  }
  if (!paybutton.triggers.map(t => t.id).includes(values.triggerId)) {
    throw new Error(RESPONSE_MESSAGES.INVALID_RESOURCE_UPDATE_400.message)
  }
  return await prisma.paybuttonTrigger.delete({
    where: {
      id: values.triggerId
    }
  })
}

function isEmptyUpdateParams (values: UpdatePaybuttonTriggerInput): boolean {
  return (
    (values.postURL === '' || values.postURL === undefined) &&
    (values.postData === '' || values.postData === undefined) &&
    (!values.sendEmail)
  )
}

export async function updateTrigger (paybuttonId: string, values: UpdatePaybuttonTriggerInput): Promise<PaybuttonTrigger> {
  const paybutton = await fetchPaybuttonWithTriggers(paybuttonId)
  if (paybutton.providerUserId !== values.userId) {
    throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
  }
  if (!paybutton.triggers.map(t => t.id).includes(values.triggerId)) {
    throw new Error(RESPONSE_MESSAGES.INVALID_RESOURCE_UPDATE_400.message)
  }
  if (isEmptyUpdateParams(values)) {
    return await prisma.paybuttonTrigger.delete({
      where: {
        id: values.triggerId
      }
    })
  }
  return await prisma.paybuttonTrigger.update({
    data: {
      sendEmail: values.sendEmail,
      postURL: values.postURL ?? '',
      postData: values.postData ?? ''
    },
    where: {
      id: values.triggerId
    }
  })
}

export async function fetchTriggersForPaybuttonAddresses (paybuttonId: string): Promise<PaybuttonTrigger[]> {
  const paybutton = await fetchPaybuttonById(paybuttonId)
  const addressStringList = paybutton.addresses.map((conn) => conn.address.address)
  const userId = paybutton.providerUserId
  return await prisma.paybuttonTrigger.findMany({
    where: {
      paybutton: {
        addresses: {
          some: {
            address: {
              address: {
                in: addressStringList
              }
            }
          }
        },
        providerUserId: userId
      }
    }
  })
}

export async function fetchTriggersForAddress (addressString: string): Promise<TriggerWithPaybutton[]> {
  return await prisma.paybuttonTrigger.findMany({
    where: {
      paybutton: {
        addresses: {
          some: {
            address: {
              address: addressString
            }
          }
        }
      }
    },
    include: {
      paybutton: true
    }
  })
}

type TriggerLogActionType = 'SendEmail' | 'PostData'

interface TriggerLogErrorData {
  errorName: string
  errorMessage: string
  errorStack: string
}

interface TriggerLogData {
  responseData: string
}

export async function executeAddressTriggers (broadcastTxData: BroadcastTxData): Promise<void> {
  const paymentAddress = broadcastTxData.address
  const tx = broadcastTxData.txs[0]
  const amount = tx.amount
  const currency = NETWORK_TICKERS_FROM_ID[tx.address.networkId]
  const txId = tx.hash
  const timestamp = tx.timestamp

  const addressTriggers = await fetchTriggersForAddress(paymentAddress)
  await Promise.all(addressTriggers.map(async (trigger) => {
    const postDataParameters: PostDataParameters = {
      amount,
      currency,
      txId,
      buttonName: trigger.paybutton.name,
      paymentAddress,
      timestamp
    }
    await postDataForTrigger(trigger, postDataParameters)
  }))
}

async function postDataForTrigger (trigger: TriggerWithPaybutton, postDataParameters: PostDataParameters): Promise<void> {
  const actionType: TriggerLogActionType = 'PostData'
  let logData: TriggerLogData | TriggerLogErrorData
  let isError = false
  try {
    const parsedPostDataParameters = parseTriggerPostData(trigger.postData, postDataParameters)
    const response = await axios.post(trigger.postURL, parsedPostDataParameters)
    const responseData = await response.data
    logData = {
      responseData
    }
  } catch (err: any) {
    isError = true
    logData = {
      errorName: err.name,
      errorMessage: err.message,
      errorStack: err.stack
    }
  } finally {
    await prisma.triggerLog.create({
      data: {
        triggerId: trigger.id,
        isError,
        actionType,
        data: JSON.stringify(logData)
      }
    })
  }
}
