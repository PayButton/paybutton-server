import { PaybuttonTrigger, Prisma } from '@prisma/client'
import axios from 'axios'
import { RESPONSE_MESSAGES, NETWORK_TICKERS_FROM_ID } from 'constants/index'
import prisma from 'prisma/clientInstance'
import { parseTriggerPostData } from 'utils/validators'
import { BroadcastTxData } from 'ws-service/types'
import { fetchPaybuttonById, fetchPaybuttonWithTriggers } from './paybuttonService'
import config from 'config'
import crypto from 'crypto'
import { getUserSecretKey } from './userService'

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
  const postURL = values.postURL ?? ''
  const postData = values.postData ?? ''
  if (postURL === '' || postData === '') {
    throw new Error(RESPONSE_MESSAGES.POST_URL_AND_DATA_MUST_BE_SET_TOGETHER_400.message)
  }
  return await prisma.paybuttonTrigger.create({
    data: {
      paybuttonId,
      sendEmail: values.sendEmail,
      postURL,
      postData
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

interface PostDataTriggerLogError {
  errorName: string
  errorMessage: string
  errorStack: string
  triggerPostData: string
  triggerPostURL: string
}

interface PostDataTriggerLog {
  postedData: string
  postedURL: string
  responseData: string
}

export async function executeAddressTriggers (broadcastTxData: BroadcastTxData): Promise<void> {
  const address = broadcastTxData.address
  const tx = broadcastTxData.txs[0]
  const amount = tx.amount
  const currency = NETWORK_TICKERS_FROM_ID[tx.address.networkId]
  const txId = tx.hash
  const timestamp = tx.timestamp
  const opReturn = tx.opReturn

  const addressTriggers = await fetchTriggersForAddress(address)
  await Promise.all(addressTriggers.map(async (trigger) => {
    const postDataParameters: PostDataParameters = {
      amount,
      currency,
      txId,
      buttonName: trigger.paybutton.name,
      address,
      timestamp,
      opReturn
    }
    const hmac = await hashPostData(trigger.paybutton.providerUserId, postDataParameters)
    await postDataForTrigger(trigger, {
      ...postDataParameters,
      hmac
    }
    )
  }))
}

export interface PostDataParameters {
  amount: Prisma.Decimal
  currency: string
  timestamp: number
  txId: string
  buttonName: string
  address: string
  opReturn: string
}

export interface PostDataParametersHashed {
  amount: Prisma.Decimal
  currency: string
  timestamp: number
  txId: string
  buttonName: string
  address: string
  opReturn: string
  hmac: string
}

async function hashPostData (userId: string, { amount, currency, address, timestamp, txId }: PostDataParameters): Promise<string> {
  const dataHash = crypto.createHash('sha256')
  dataHash.update(`${amount.toString()}+${currency}+${address}+${timestamp.toString()}+${txId}`)
  const dataHashDigest = dataHash.digest('hex')
  const hmac = crypto.createHmac('sha256', await getUserSecretKey(userId))
  hmac.update(dataHashDigest)
  return hmac.digest('hex')
}

async function postDataForTrigger (trigger: TriggerWithPaybutton, postDataParametersHashed: PostDataParametersHashed): Promise<void> {
  const actionType: TriggerLogActionType = 'PostData'
  let logData!: PostDataTriggerLog | PostDataTriggerLogError
  let isError = false
  try {
    const parsedPostDataParameters = parseTriggerPostData(trigger.postData, postDataParametersHashed)
    const response = await axios.post(
      trigger.postURL,
      parsedPostDataParameters,
      {
        timeout: config.triggerPOSTTimeout
      }
    )
    const responseData = await response.data
    logData = {
      postedData: parsedPostDataParameters,
      postedURL: trigger.postURL,
      responseData
    }
  } catch (err: any) {
    isError = true
    logData = {
      errorName: err.name,
      errorMessage: err.message,
      errorStack: err.stack,
      triggerPostData: trigger.postData,
      triggerPostURL: trigger.postURL
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
