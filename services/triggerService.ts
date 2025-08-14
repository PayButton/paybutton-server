import { PaybuttonTrigger, Prisma, UserProfile } from '@prisma/client'
import axios from 'axios'
import { RESPONSE_MESSAGES, NETWORK_TICKERS_FROM_ID, SUPPORTED_QUOTES_FROM_ID, TRIGGER_LOG_BATCH_SIZE, TRIGGER_POST_CONCURRENCY, TRIGGER_EMAIL_CONCURRENCY } from 'constants/index'
import prisma from 'prisma-local/clientInstance'
import { EMPTY_OP_RETURN, OpReturnData, parseTriggerPostData } from 'utils/validators'
import { BroadcastTxData, SimplifiedTransaction } from 'ws-service/types'
import { fetchPaybuttonById, fetchPaybuttonWithTriggers } from './paybuttonService'
import config from 'config'
import { MAIL_FROM, MAIL_HTML_REPLACER, MAIL_SUBJECT, getMailerTransporter, SendEmailParameters } from 'constants/mail'
import { getTransactionValue } from './transactionService'
import { runAsyncInBatches } from 'utils'

const triggerWithPaybutton = Prisma.validator<Prisma.PaybuttonTriggerDefaultArgs>()({
  include: { paybutton: true }
})

export type TriggerWithPaybutton = Prisma.PaybuttonTriggerGetPayload<typeof triggerWithPaybutton>

// Include Paybutton.owner user inline so we don't refetch per trigger
const triggerWithPaybuttonAndUserInclude = {
  paybutton: {
    include: {
      user: true,
      addresses: {
        select: {
          address: {
            select: {
              address: true
            }
          }
        }
      }
    }
  }
}

const triggerWithPaybuttonAndUser = Prisma.validator<Prisma.PaybuttonTriggerDefaultArgs>()({
  include: triggerWithPaybuttonAndUserInclude
})

type TriggerWithPaybuttonAndUser = Prisma.PaybuttonTriggerGetPayload<typeof triggerWithPaybuttonAndUser>

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
  if (process.env.DONT_EXECUTE_TRIGGERS === 'true') {
    console.log(`DONT_EXECUTE_TRIGGERS in env, skipping execution for broadcast ${broadcastTxData.address}`)
    return
  }
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
    const values = getTransactionValue(tx)
    const addressTriggers = await fetchTriggersForAddress(address)
    if (addressTriggers.length === 0) return
    console.log(`[TRIGGER ${currency}]: Will execute ${addressTriggers.length} triggers for tx ${hash} and address ${address}`)

    // Send post requests
    const posterTriggers = addressTriggers.filter(t => !t.isEmailTrigger)
    await Promise.all(posterTriggers.map(async (trigger) => {
      const userProfile = await fetchUserFromTriggerId(trigger.id)
      const quoteSlug = SUPPORTED_QUOTES_FROM_ID[userProfile.preferredCurrencyId]
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
        inputAddresses,
        value: values[quoteSlug].toString()
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
  const pb = await prisma.paybutton.findFirstOrThrow({
    where: {
      triggers: {
        some: {
          id: triggerId
        }
      }
    },
    select: {
      providerUserId: true
    }
  })

  return await prisma.userProfile.findUniqueOrThrow({
    where: {
      id: pb.providerUserId
    }
  })
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
  inputAddresses?: string[]
  value: string
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

async function fetchTriggersGroupedByAddress (addresses: string[]): Promise<Map<string, TriggerWithPaybuttonAndUser[]>> {
  if (addresses.length === 0) return new Map()

  const triggers = await prisma.paybuttonTrigger.findMany({
    where: {
      paybutton: {
        addresses: {
          some: {
            address: {
              address: {
                in: addresses
              }
            }
          }
        }
      }
    },
    include: triggerWithPaybuttonAndUserInclude
  })

  const byAddr = new Map<string, TriggerWithPaybuttonAndUser[]>()
  for (const t of triggers as TriggerWithPaybuttonAndUser[]) {
    for (const conn of t.paybutton.addresses) {
      const addr = conn.address.address
      const arr = byAddr.get(addr) ?? []
      arr.push(t)
      byAddr.set(addr, arr)
    }
  }
  return byAddr
}

function buildPostParams (
  trigger: TriggerWithPaybuttonAndUser,
  tx: SimplifiedTransaction,
  currency: string,
  valueStr: string,
  address: string
): PostDataParameters {
  return {
    amount: tx.amount,
    currency,
    txId: tx.hash,
    buttonName: trigger.paybutton.name,
    address,
    timestamp: tx.timestamp,
    opReturn: (tx.paymentId !== '' || tx.message !== '')
      ? { paymentId: tx.paymentId, message: tx.message, rawMessage: tx.rawMessage }
      : EMPTY_OP_RETURN,
    inputAddresses: tx.inputAddresses,
    value: valueStr
  }
}

function makePostTask (
  trigger: TriggerWithPaybuttonAndUser,
  tx: SimplifiedTransaction,
  currency: string,
  valueStr: string,
  logs: Prisma.TriggerLogCreateManyInput[],
  availablePostCredits: Record<string, number>,
  acceptedPostsPerUser: Record<string, number>,
  address: string
): (() => Promise<void>) | null {
  const user = trigger.paybutton.user
  if (availablePostCredits[user.id] === undefined) {
    availablePostCredits[user.id] = user.postCredits
  }

  // no credits left => log and skip scheduling task
  if (availablePostCredits[user.id] <= 0) {
    const actionType: TriggerLogActionType = 'PostData'
    const data: PostDataTriggerLogError = {
      errorName: 'USER_OUT_OF_POST_CREDITS',
      errorMessage: 'USER_OUT_OF_POST_CREDITS',
      errorStack: '',
      triggerPostData: trigger.postData,
      triggerPostURL: trigger.postURL
    }
    logs.push({ triggerId: trigger.id, isError: true, actionType, data: JSON.stringify(data) })
    return null
  }

  // reserve one credit in the snapshot to avoid overscheduling
  availablePostCredits[user.id] -= 1

  return async () => {
    const actionType: TriggerLogActionType = 'PostData'
    let isError = false
    let data!: PostDataTriggerLog | PostDataTriggerLogError
    try {
      const params = buildPostParams(trigger, tx, currency, valueStr, address)
      const parsed = parseTriggerPostData({ userId: user.id, postData: trigger.postData, postDataParameters: params })
      const resp = await axios.post(trigger.postURL, parsed, { timeout: config.triggerPOSTTimeout })

      // treat 2xx as accepted
      if (resp.status >= 200 && resp.status < 300) {
        acceptedPostsPerUser[user.id] = (acceptedPostsPerUser[user.id] ?? 0) + 1
      }

      data = { postedData: parsed, postedURL: trigger.postURL, responseData: resp.data }
    } catch (err: any) {
      isError = true
      data = { errorName: err.name, errorMessage: err.message, errorStack: err.stack, triggerPostData: trigger.postData, triggerPostURL: trigger.postURL }
    } finally {
      logs.push({ triggerId: trigger.id, isError, actionType, data: JSON.stringify(data) })
    }
  }
}

function makeEmailTask (
  trigger: TriggerWithPaybuttonAndUser,
  tx: SimplifiedTransaction,
  currency: string,
  logs: Prisma.TriggerLogCreateManyInput[],
  availableEmailCredits: Record<string, number>,
  acceptedPerUser: Record<string, number>
): (() => Promise<void>) | null {
  const user = trigger.paybutton.user
  if (availableEmailCredits[user.id] === undefined) availableEmailCredits[user.id] = user.emailCredits

  // No credits left => log and skip scheduling
  if (availableEmailCredits[user.id] <= 0) {
    const actionType: TriggerLogActionType = 'SendEmail'
    const data: EmailTriggerLogError = {
      errorName: 'USER_OUT_OF_EMAIL_CREDITS',
      errorMessage: RESPONSE_MESSAGES.USER_OUT_OF_EMAIL_CREDITS_400.message,
      errorStack: '',
      triggerEmail: trigger.emails
    }
    logs.push({ triggerId: trigger.id, isError: true, actionType, data: JSON.stringify(data) })
    return null
  }

  // Reserve one from snapshot to avoid overscheduling
  availableEmailCredits[user.id] -= 1

  return async () => {
    const actionType: TriggerLogActionType = 'SendEmail'
    let isError = false
    let data!: EmailTriggerLog | EmailTriggerLogError
    try {
      const mailOptions = {
        from: MAIL_FROM,
        to: trigger.emails,
        subject: MAIL_SUBJECT,
        html: MAIL_HTML_REPLACER({
          amount: tx.amount,
          currency,
          txId: tx.hash,
          buttonName: trigger.paybutton.name,
          address: tx.address ?? '',
          timestamp: tx.timestamp,
          opReturn: (tx.paymentId !== '' || tx.message !== '')
            ? { paymentId: tx.paymentId, message: tx.message, rawMessage: tx.rawMessage }
            : EMPTY_OP_RETURN
        })
      }
      const resp = await getMailerTransporter().sendMail(mailOptions)
      data = { email: trigger.emails, responseData: resp.response }

      if (Array.isArray(resp.accepted) && resp.accepted.includes(trigger.emails)) {
        acceptedPerUser[user.id] = (acceptedPerUser[user.id] ?? 0) + 1
      }
    } catch (err: any) {
      isError = true
      data = { errorName: err.name, errorMessage: err.message, errorStack: err.stack, triggerEmail: trigger.emails }
    } finally {
      logs.push({ triggerId: trigger.id, isError, actionType, data: JSON.stringify(data) })
    }
  }
}

async function persistLogsAndDecrements (
  logs: Prisma.TriggerLogCreateManyInput[],
  acceptedEmailPerUser: Record<string, number>,
  acceptedPostsPerUser: Record<string, number>
): Promise<void> {
  const userIds = Array.from(new Set([
    ...Object.keys(acceptedEmailPerUser),
    ...Object.keys(acceptedPostsPerUser)
  ]))

  await prisma.$transaction(async (tx) => {
    // logs in chunks
    for (let i = 0; i < logs.length; i += TRIGGER_LOG_BATCH_SIZE) {
      await tx.triggerLog.createMany({ data: logs.slice(i, i + TRIGGER_LOG_BATCH_SIZE) })
    }

    if (userIds.length === 0) return

    // single read for all balances
    const balances = await tx.userProfile.findMany({
      where: { id: { in: userIds } },
      select: { id: true, emailCredits: true, postCredits: true }
    })
    const balancesById = new Map(balances.map(u => [u.id, u]))

    // per-user clamped decrements (combine both fields in one update each)
    const updates: Array<Promise<any>> = []
    for (const id of userIds) {
      const row = balancesById.get(id)
      if (row === undefined) continue
      const wantEmail = acceptedEmailPerUser[id] ?? 0
      const wantPost = acceptedPostsPerUser[id] ?? 0
      const decEmail = Math.min(Math.max(wantEmail, 0), row.emailCredits ?? 0)
      const decPost = Math.min(Math.max(wantPost, 0), row.postCredits ?? 0)
      if (decEmail > 0 || decPost > 0) {
        updates.push(tx.userProfile.update({
          where: { id },
          data: {
            ...(decEmail > 0 ? { emailCredits: { decrement: decEmail } } : {}),
            ...(decPost > 0 ? { postCredits: { decrement: decPost } } : {})
          }
        }))
      }
    }
    if (updates.length > 0) await Promise.all(updates)
  })
}

export async function executeTriggersBatch (broadcasts: BroadcastTxData[], networkId: number): Promise<void> {
  if (process.env.DONT_EXECUTE_TRIGGERS === 'true') {
    console.log(`DONT_EXECUTE_TRIGGERS in env, skipping batch execution of triggers ${broadcasts.length}`)
    return
  }

  const items = broadcasts.flatMap(b => (b.txs ?? []).map(t => ({ address: b.address, tx: t })))
  if (items.length === 0) return

  const currency = NETWORK_TICKERS_FROM_ID[networkId]
  const addresses = [...new Set(items.map(i => i.address))]
  const triggersByAddr = await fetchTriggersGroupedByAddress(addresses)

  const postTasks: Array<() => Promise<void>> = []
  const emailTasks: Array<() => Promise<void>> = []
  const logs: Prisma.TriggerLogCreateManyInput[] = []

  const availableEmailCredits: Record<string, number> = {}
  const availablePostCredits: Record<string, number> = {}

  const acceptedEmailPerUser: Record<string, number> = {}
  const acceptedPostsPerUser: Record<string, number> = {}

  let skippedEmailNoCredit = 0
  let skippedPostNoCredit = 0

  for (const { address, tx } of items) {
    const triggers = triggersByAddr.get(address) ?? []
    if (triggers.length === 0) continue

    const values = getTransactionValue(tx)

    for (const trigger of triggers) {
      if (trigger.isEmailTrigger) {
        const before = (availableEmailCredits[trigger.paybutton.user.id] ?? trigger.paybutton.user.emailCredits)
        const task = makeEmailTask(trigger, tx, currency, logs, availableEmailCredits, acceptedEmailPerUser)
        if (task !== null) emailTasks.push(task)
        else if (before <= 0) skippedEmailNoCredit++
      } else {
        const quoteSlug = SUPPORTED_QUOTES_FROM_ID[trigger.paybutton.user.preferredCurrencyId]
        const before = (availablePostCredits[trigger.paybutton.user.id] ?? trigger.paybutton.user.postCredits)
        const task = makePostTask(trigger, tx, currency, values[quoteSlug].toString(), logs, availablePostCredits, acceptedPostsPerUser, address)
        if (task != null) postTasks.push(task)
        else if (before <= 0) skippedPostNoCredit++
      }
    }
  }

  console.log(`[TRIGGER ${currency}]: batch start — items=${items.length} postTasks=${postTasks.length} emailTasks=${emailTasks.length} skippedNoCredits(email=${skippedEmailNoCredit}, post=${skippedPostNoCredit})`)

  await runAsyncInBatches(postTasks, TRIGGER_POST_CONCURRENCY)
  await runAsyncInBatches(emailTasks, TRIGGER_EMAIL_CONCURRENCY)

  await persistLogsAndDecrements(logs, acceptedEmailPerUser, acceptedPostsPerUser)

  const chargedUsers = new Set([
    ...Object.keys(acceptedEmailPerUser),
    ...Object.keys(acceptedPostsPerUser)
  ])
  console.log(`[TRIGGER ${currency}]: batch done — logs=${logs.length} usersCharged=${chargedUsers.size} accepted(email=${Object.values(acceptedEmailPerUser).reduce((a, b) => a + b, 0)}, post=${Object.values(acceptedPostsPerUser).reduce((a, b) => a + b, 0)})`)
}
