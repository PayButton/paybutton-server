import { PaybuttonTrigger, Prisma, UserProfile } from '@prisma/client'
import axios from 'axios'
import { RESPONSE_MESSAGES, NETWORK_TICKERS_FROM_ID } from 'constants/index'
import prisma from 'prisma/clientInstance'
import { EMPTY_OP_RETURN, OpReturnData, parseTriggerPostData } from 'utils/validators'
import { BroadcastTxData } from 'ws-service/types'
import { fetchPaybuttonById, fetchPaybuttonWithTriggers } from './paybuttonService'
import config from 'config'
import { MAIL_FROM, MAIL_HTML_REPLACER, MAIL_SUBJECT, getMailerTransporter, SendEmailParameters } from 'constants/mail'

const triggerWithPaybutton = Prisma.validator<Prisma.PaybuttonTriggerDefaultArgs>()({
  include: { paybutton: true }
})

export type TriggerWithPaybutton = Prisma.PaybuttonTriggerGetPayload<typeof triggerWithPaybutton>

export interface DeletePaybuttonTriggerInput {
  userId: string
  triggerId: string
}

export interface UpdatePaybuttonTriggerInput {
  userId: string
  emails?: string
  isEmailTrigger: boolean
  postURL?: string
  postData?: string
  triggerId: string
}

export interface CreatePaybuttonTriggerInput {
  userId: string
  isEmailTrigger: boolean
  emails?: string
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

async function validateTriggerForPaybutton (paybuttonId: string, values: CreatePaybuttonTriggerInput | UpdatePaybuttonTriggerInput): Promise<void> {
  const postURL = values.postURL ?? ''
  const postData = values.postData ?? ''
  const isEmailTrigger = values.isEmailTrigger
  const emails = values.emails ?? ''
  const userId = values.userId
  const paybutton = await fetchPaybuttonWithTriggers(paybuttonId)

  if (paybutton.providerUserId !== userId) {
    throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
  }

  // Update
  const isUpdate = 'triggerId' in values
  if (isUpdate) {
    if (!paybutton.triggers.map(t => t.id).includes(values.triggerId)) {
      throw new Error(RESPONSE_MESSAGES.INVALID_RESOURCE_UPDATE_400.message)
    }
  }

  const paybuttonEmailTriggers = paybutton.triggers.filter(t => t.isEmailTrigger)
  const paybuttonPosterTriggers = paybutton.triggers.filter(t => !t.isEmailTrigger)

  if (
    !isUpdate &&
    (
      (isEmailTrigger && paybuttonEmailTriggers.length > 0) ||
      (!isEmailTrigger && paybuttonPosterTriggers.length > 0)
    )
  ) {
    throw new Error(RESPONSE_MESSAGES.LIMIT_TRIGGERS_PER_BUTTON_400.message)
  }
  const addressTriggers = (await fetchTriggersForPaybuttonAddresses(paybutton.id))
  const addressEmailTriggers = addressTriggers.filter(t => t.isEmailTrigger)
  const addressPosterTriggers = addressTriggers.filter(t => !t.isEmailTrigger)

  if (
    !isUpdate &&
    (
      (isEmailTrigger && addressEmailTriggers.length > 0) ||
      (!isEmailTrigger && addressPosterTriggers.length > 0)
    )
  ) {
    throw new Error(RESPONSE_MESSAGES.LIMIT_TRIGGERS_PER_BUTTON_ADDRESSES_400.message)
  }

  if (isEmailTrigger) {
    if (emails === '') {
      throw new Error(RESPONSE_MESSAGES.MISSING_EMAIL_FOR_TRIGGER_400.message)
    }
  } else if (postURL === '' || postData === '') {
    throw new Error(RESPONSE_MESSAGES.POST_URL_AND_DATA_MUST_BE_SET_TOGETHER_400.message)
  }
}

export async function createTrigger (paybuttonId: string, values: CreatePaybuttonTriggerInput): Promise<PaybuttonTrigger> {
  const postURL = values.postURL ?? ''
  const postData = values.postData ?? ''
  const emails = values.emails ?? ''
  const isEmailTrigger = values.isEmailTrigger

  await validateTriggerForPaybutton(paybuttonId, values)
  return await prisma.paybuttonTrigger.create({
    data: {
      paybuttonId,
      emails,
      postURL,
      postData,
      isEmailTrigger
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
    (values.emails === '' || values.emails === undefined)
  )
}

export async function updateTrigger (paybuttonId: string, values: UpdatePaybuttonTriggerInput): Promise<PaybuttonTrigger> {
  if (isEmptyUpdateParams(values)) {
    return await prisma.paybuttonTrigger.delete({
      where: {
        id: values.triggerId
      }
    })
  }
  await validateTriggerForPaybutton(paybuttonId, values)
  return await prisma.paybuttonTrigger.update({
    data: {
      postURL: values.postURL ?? '',
      postData: values.postData ?? '',
      emails: values.emails ?? ''
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

interface EmailTriggerLogError {
  errorName: string
  errorMessage: string
  errorStack: string
  triggerEmail: string
}

interface EmailTriggerLog {
  email: string
  responseData: string
}

export async function executeAddressTriggers (broadcastTxData: BroadcastTxData, networkId: number): Promise<void> {
  try {
    const address = broadcastTxData.address
    const tx = broadcastTxData.txs[0]
    const currency = NETWORK_TICKERS_FROM_ID[networkId]
    const {
      amount,
      hash,
      timestamp,
      paymentId,
      message,
      rawMessage,
      inputAddresses
    } = tx

    const addressTriggers = await fetchTriggersForAddress(address)
    if (addressTriggers.length === 0) return
    console.log(`[TRIGGER ${currency}]: Will execute ${addressTriggers.length} triggers for tx ${hash} and address ${address}`)

    // Send post requests
    const posterTriggers = addressTriggers.filter(t => !t.isEmailTrigger)
    await Promise.all(posterTriggers.map(async (trigger) => {
      const postDataParameters: PostDataParameters = {
        amount,
        currency,
        txId: hash,
        buttonName: trigger.paybutton.name,
        address,
        timestamp,
        opReturn: paymentId !== '' || message !== ''
          ? {
              paymentId,
              message,
              rawMessage
            }
          : EMPTY_OP_RETURN,
        inputAddresses
      }
      await postDataForTrigger(trigger, postDataParameters)
    }))

    // Send emails
    const emailTriggers = addressTriggers.filter(t => t.isEmailTrigger)
    const sendEmailParameters: Partial<SendEmailParameters> = {
      amount,
      currency,
      txId: hash,
      address,
      timestamp,
      opReturn: paymentId !== '' || message !== ''
        ? {
            paymentId,
            message,
            rawMessage
          }
        : EMPTY_OP_RETURN
    }
    await Promise.all(emailTriggers.map(async (trigger) => {
      sendEmailParameters.buttonName = trigger.paybutton.name
      await sendEmailForTrigger(trigger, sendEmailParameters as SendEmailParameters)
    }))
  } catch (err: any) {
    console.error(RESPONSE_MESSAGES.COULD_NOT_EXECUTE_TRIGGER_500.message, err.stack)
  }
}

async function fetchUserFromTriggerId (triggerId: string): Promise<UserProfile> {
  const result = await prisma.paybuttonTrigger.findUniqueOrThrow({
    where: { id: triggerId },
    select: {
      paybutton: {
        select: {
          addresses: {
            select: {
              address: {
                select: {
                  userProfiles: {
                    select: {
                      userProfile: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })

  // Since there may be multiple user profiles linked, extract the first one if needed
  const userProfile = result.paybutton.addresses[0].address.userProfiles[0].userProfile
  return userProfile
}

async function decrementUserCreditCount (userId: string): Promise<void> {
  await prisma.userProfile.update({
    where: {
      id: userId
    },
    data: {
      emailCredits: { decrement: 1 }
    }
  })
}

async function sendEmailForTrigger (trigger: TriggerWithPaybutton, sendEmailParameters: SendEmailParameters): Promise<void> {
  const actionType: TriggerLogActionType = 'SendEmail'
  let logData!: EmailTriggerLog | EmailTriggerLogError
  let isError = false

  const mailOptions = {
    from: MAIL_FROM,
    to: trigger.emails,
    subject: MAIL_SUBJECT,
    html: MAIL_HTML_REPLACER(sendEmailParameters)
  }

  try {
    const user = await fetchUserFromTriggerId(trigger.id)
    if (user.emailCredits > 0) {
      const response = await getMailerTransporter().sendMail(mailOptions)
      logData = {
        email: trigger.emails,
        responseData: response.response
      }
      if (response.accepted.includes(trigger.emails)) {
        await decrementUserCreditCount(user.id)
      }
    } else {
      logData = {
        errorName: 'USER_OUT_OF_EMAIL_CREDITS',
        errorMessage: RESPONSE_MESSAGES.USER_OUT_OF_EMAIL_CREDITS_400.message,
        errorStack: '',
        triggerEmail: trigger.emails
      }
    }
  } catch (err: any) {
    isError = true
    logData = {
      errorName: err.name,
      errorMessage: err.message,
      errorStack: err.stack,
      triggerEmail: trigger.emails
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

export interface PostDataParameters {
  amount: Prisma.Decimal
  currency: string
  timestamp: number
  txId: string
  buttonName: string
  address: string
  opReturn: OpReturnData
  inputAddresses?: Array<string | undefined>
}

async function postDataForTrigger (trigger: TriggerWithPaybutton, postDataParameters: PostDataParameters): Promise<void> {
  const actionType: TriggerLogActionType = 'PostData'
  let logData!: PostDataTriggerLog | PostDataTriggerLogError
  let isError = false
  try {
    const parsedPostDataParameters = parseTriggerPostData({
      userId: trigger.paybutton.providerUserId,
      postData: trigger.postData,
      postDataParameters
    })
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
