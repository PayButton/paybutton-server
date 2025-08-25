import { PaybuttonTrigger, Prisma } from '@prisma/client'
import axios from 'axios'
import { RESPONSE_MESSAGES, NETWORK_TICKERS_FROM_ID, SUPPORTED_QUOTES_FROM_ID, TRIGGER_LOG_BATCH_SIZE, TRIGGER_POST_CONCURRENCY, TRIGGER_EMAIL_CONCURRENCY } from 'constants/index'
import prisma from 'prisma-local/clientInstance'
import { EMPTY_OP_RETURN, OpReturnData, parseTriggerPostData } from 'utils/validators'
import { BroadcastTxData, SimplifiedTransaction } from 'ws-service/types'
import { fetchPaybuttonById, fetchPaybuttonWithTriggers } from './paybuttonService'
import config from 'config'
import { MAIL_FROM, MAIL_HTML_REPLACER, MAIL_SUBJECT, getMailerTransporter } from 'constants/mail'
import { getTransactionValue } from './transactionService'
import { runAsyncInBatches } from 'utils/index'

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

export async function executeAddressTriggers (
  broadcastTxData: BroadcastTxData,
  networkId: number
): Promise<void> {
  if (process.env.DONT_EXECUTE_TRIGGERS === 'true') {
    console.log(`DONT_EXECUTE_TRIGGERS in env, skipping execution for broadcast ${broadcastTxData.address}`)
    return
  }
  await executeTriggersBatch([broadcastTxData], networkId)
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
  address: string
): () => Promise<boolean> {
  return async () => {
    const actionType: TriggerLogActionType = 'PostData'
    let accepted = false
    let isError = false
    let data!: PostDataTriggerLog | PostDataTriggerLogError
    try {
      const params = buildPostParams(trigger, tx, currency, valueStr, address)
      const parsed = parseTriggerPostData({ userId: trigger.paybutton.user.id, postData: trigger.postData, postDataParameters: params })
      const resp = await axios.post(trigger.postURL, parsed, { timeout: config.triggerPOSTTimeout })
      // HTTP 2xx counts as accepted
      accepted = resp.status >= 200 && resp.status < 300
      data = { postedData: parsed, postedURL: trigger.postURL, responseData: resp.data }
    } catch (err: any) {
      isError = true
      data = { errorName: err.name, errorMessage: err.message, errorStack: err.stack, triggerPostData: trigger.postData, triggerPostURL: trigger.postURL }
    } finally {
      logs.push({ triggerId: trigger.id, isError, actionType, data: JSON.stringify(data) })
    }
    return accepted
  }
}

function makeEmailTask (
  trigger: TriggerWithPaybuttonAndUser,
  tx: SimplifiedTransaction,
  currency: string,
  logs: Prisma.TriggerLogCreateManyInput[]
): () => Promise<boolean> {
  return async () => {
    const actionType: TriggerLogActionType = 'SendEmail'
    let accepted = false
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
      accepted = Array.isArray(resp.accepted) && resp.accepted.includes(trigger.emails)
    } catch (err: any) {
      isError = true
      data = { errorName: err.name, errorMessage: err.message, errorStack: err.stack, triggerEmail: trigger.emails }
    } finally {
      logs.push({ triggerId: trigger.id, isError, actionType, data: JSON.stringify(data) })
    }
    return accepted
  }
}

async function persistLogsAndDecrements (
  logs: Prisma.TriggerLogCreateManyInput[],
  acceptedEmailPerUser: Record<string, number>,
  acceptedPostsPerUser: Record<string, number>
): Promise<void> {
  if (logs.length > 0) {
    for (let i = 0; i < logs.length; i += TRIGGER_LOG_BATCH_SIZE) {
      const slice = logs.slice(i, i + TRIGGER_LOG_BATCH_SIZE)
      await prisma.triggerLog.createMany({ data: slice })
    }
  }

  // 2) Then try credits in a separate transaction
  const userIds = Array.from(new Set([
    ...Object.keys(acceptedEmailPerUser),
    ...Object.keys(acceptedPostsPerUser)
  ]))
  if (userIds.length === 0) return

  try {
    await prisma.$transaction(async (tx) => {
      const balances = await tx.userProfile.findMany({
        where: { id: { in: userIds } },
        select: { id: true, emailCredits: true, postCredits: true }
      })
      const byId = new Map(balances.map(u => [u.id, u]))

      const updates: Array<Promise<unknown>> = []
      for (const id of userIds) {
        const row = byId.get(id)
        if (row == null) continue
        const reqEmail = acceptedEmailPerUser[id] ?? 0
        const reqPost = acceptedPostsPerUser[id] ?? 0
        const decEmail = Math.min(Math.max(reqEmail, 0), row.emailCredits ?? 0)
        const decPost = Math.min(Math.max(reqPost, 0), row.postCredits ?? 0)
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
  } catch (e: any) {
    console.error(`[TRIGGER]: credit decrement tx failed: ${e?.message as string ?? e as string}`)
    // logs already written; we don’t rollback them
  }
}

interface TriggerTask {
  run: () => Promise<boolean> // resolves true if accepted
  triggerId: string
  actionType: 'PostData' | 'SendEmail'
}

async function runTasksUpToCredits (
  tasks: TriggerTask[],
  credits: number
): Promise<{ accepted: number, attempted: number }> {
  if (credits <= 0 || tasks.length === 0) return { accepted: 0, attempted: 0 }

  let accepted = 0
  let attempted = 0
  let idx = 0

  // Keep attempting until we achieve `credits` accepted OR we exhaust tasks.
  while (accepted < credits && idx < tasks.length) {
    const remainingNeeded = credits - accepted
    const batch = tasks.slice(idx, idx + remainingNeeded)
    idx += batch.length
    attempted += batch.length

    const results = await Promise.all(batch.map(async t => await t.run()))
    for (const ok of results) if (ok) accepted += 1
  }

  return { accepted, attempted }
}

function appendOutOfCreditsLogs (
  queue: TriggerTask[],
  startIndex: number,
  logs: Prisma.TriggerLogCreateManyInput[],
  kind: 'PostData' | 'SendEmail'
): void {
  const msg =
    kind === 'PostData'
      ? RESPONSE_MESSAGES.USER_OUT_OF_POST_CREDITS_400.message
      : RESPONSE_MESSAGES.USER_OUT_OF_EMAIL_CREDITS_400.message

  for (let i = startIndex; i < queue.length; i++) {
    logs.push({
      triggerId: queue[i].triggerId,
      isError: true,
      actionType: kind,
      data: JSON.stringify({
        errorName: kind === 'PostData' ? 'USER_OUT_OF_POST_CREDITS' : 'USER_OUT_OF_EMAIL_CREDITS',
        errorMessage: msg,
        errorStack: ''
      })
    })
  }
}

export async function executeTriggersBatch (broadcasts: BroadcastTxData[], networkId: number): Promise<void> {
  if (process.env.DONT_EXECUTE_TRIGGERS === 'true') {
    console.log(`DONT_EXECUTE_TRIGGERS in env, skipping batch execution of triggers ${broadcasts.length}`)
    return
  }

  const txItems = broadcasts.flatMap(b => (b.txs ?? []).map(tx => ({ address: b.address, tx })))
  if (txItems.length === 0) return

  const currency = NETWORK_TICKERS_FROM_ID[networkId]
  const uniqueAddresses = [...new Set(txItems.map(i => i.address))]
  const triggersByAddress = await fetchTriggersGroupedByAddress(uniqueAddresses)

  // Per-user queues and credits
  const postTaskQueueByUser: Record<string, TriggerTask[]> = {}
  const emailTaskQueueByUser: Record<string, TriggerTask[]> = {}
  const userPostCredits: Record<string, number> = {}
  const userEmailCredits: Record<string, number> = {}

  const logs: Prisma.TriggerLogCreateManyInput[] = []

  // Build queues
  console.log(`[TRIGGER ${currency}]: preparing batch — txItems=${txItems.length} addresses=${uniqueAddresses.length}`)

  for (const { address, tx } of txItems) {
    const triggers = triggersByAddress.get(address) ?? []
    if (triggers.length === 0) continue

    const values = getTransactionValue(tx)

    for (const trigger of triggers) {
      const user = trigger.paybutton.user
      if (trigger.isEmailTrigger) {
        userEmailCredits[user.id] ??= user.emailCredits
        ;(emailTaskQueueByUser[user.id] ??= []).push({
          run: makeEmailTask(trigger, tx, currency, logs),
          triggerId: trigger.id,
          actionType: 'SendEmail'
        })
      } else {
        userPostCredits[user.id] ??= user.postCredits
        const quoteSlug = SUPPORTED_QUOTES_FROM_ID[user.preferredCurrencyId]
        ;(postTaskQueueByUser[user.id] ??= []).push({
          run: makePostTask(trigger, tx, currency, values[quoteSlug].toString(), logs, address),
          triggerId: trigger.id,
          actionType: 'PostData'
        })
      }
    }
  }

  const postTasksCount = Object.values(postTaskQueueByUser).map(tasks => tasks.length).reduce((a, b) => a + b, 0)
  const mailTasksCount = Object.values(emailTaskQueueByUser).map(tasks => tasks.length).reduce((a, b) => a + b, 0)
  console.log(`[TRIGGER ${currency}]: scheduling — users(posts=${Object.keys(postTaskQueueByUser).length}, emails=${Object.keys(emailTaskQueueByUser).length}) tasks(posts=${postTasksCount}, emails=${mailTasksCount})`)

  const postUserRunners = Object.entries(postTaskQueueByUser).map(([userId, queue]) => async () => {
    const limit = userPostCredits[userId] ?? 0
    const { accepted, attempted } = await runTasksUpToCredits(queue, limit)
    return { userId, accepted, attempted, total: queue.length, limit }
  })

  const emailUserRunners = Object.entries(emailTaskQueueByUser).map(([userId, queue]) => async () => {
    const limit = userEmailCredits[userId] ?? 0
    const { accepted, attempted } = await runTasksUpToCredits(queue, limit)
    return { userId, accepted, attempted, total: queue.length, limit }
  })

  const postResults: Array<{ userId: string, accepted: number, attempted: number, total: number, limit: number }> = []
  const emailResults: Array<{ userId: string, accepted: number, attempted: number, total: number, limit: number }> = []

  console.log(`[TRIGGER ${currency}]: executing posts with concurrency=${TRIGGER_POST_CONCURRENCY}`)
  await runAsyncInBatches(
    `${currency} POST TRIGGERS`,
    postUserRunners.map(run => async () => { postResults.push(await run()) }),
    TRIGGER_POST_CONCURRENCY
  )
  console.log(`[TRIGGER ${currency}]: executing emails with concurrency=${TRIGGER_EMAIL_CONCURRENCY}`)
  await runAsyncInBatches(
    `${currency} POST TRIGGERS`,
    emailUserRunners.map(run => async () => { emailResults.push(await run()) }),
    TRIGGER_EMAIL_CONCURRENCY
  )

  for (const r of postResults) {
    if (r.attempted < r.total && r.accepted >= r.limit) {
      const queue = postTaskQueueByUser[r.userId]!
      appendOutOfCreditsLogs(queue, r.attempted, logs, 'PostData')
    }
  }
  for (const r of emailResults) {
    if (r.attempted < r.total && r.accepted >= r.limit) {
      const queue = emailTaskQueueByUser[r.userId]!
      appendOutOfCreditsLogs(queue, r.attempted, logs, 'SendEmail')
    }
  }

  // Build accepted maps for decrements (charge only accepted)
  const postsAcceptedByUser = Object.fromEntries(postResults.map(r => [r.userId, r.accepted]))
  const emailsAcceptedByUser = Object.fromEntries(emailResults.map(r => [r.userId, r.accepted]))

  await persistLogsAndDecrements(logs, emailsAcceptedByUser, postsAcceptedByUser)

  const totalPostsAccepted = Object.values(postsAcceptedByUser).reduce((a, b) => a + b, 0)
  const totalEmailsAccepted = Object.values(emailsAcceptedByUser).reduce((a, b) => a + b, 0)
  const chargedUsers = new Set([...Object.keys(postsAcceptedByUser), ...Object.keys(emailsAcceptedByUser)]).size

  console.log(`[TRIGGER ${currency}]: batch done — logs=${logs.length} usersCharged=${chargedUsers} accepted(email=${totalEmailsAccepted}, post=${totalPostsAccepted})`)
}
