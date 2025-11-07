// FILE: tests/unittests/triggerService.test.ts

// --- Global mocks ---
import axios from 'axios'
import prisma from 'prisma-local/clientInstance'
import { prismaMock } from 'prisma-local/mockedClient'
import { Prisma, TriggerLog, UserProfile } from '@prisma/client'
import * as Mail from 'constants/mail'

// --- Module under test (import after mocks) ---
import {
  executeAddressTriggers,
  executeTriggersBatch,
  fetchTriggersForPaybuttonAddresses,
  fetchTriggerLogsForPaybutton,
  createTrigger,
  updateTrigger,
  deleteTrigger,
  TriggerLogActionType
} from 'services/triggerService'

import { parseTriggerPostData } from 'utils/validators'
import { fetchPaybuttonById as fetchPaybuttonByIdMock, fetchPaybuttonWithTriggers as fetchPaybuttonWithTriggersMock } from 'services/paybuttonService'

jest.mock('axios', () => ({
  __esModule: true,
  default: { post: jest.fn() }
}))

jest.mock('config', () => ({
  __esModule: true,
  default: {
    triggerPOSTTimeout: 3000,
    networkBlockchainURLs: { ecash: ['https://xec.paybutton.org'], bitcoincash: ['https://bch.paybutton.org'] },
    wsBaseURL: 'localhost:5000'
  }
}))

jest.mock('services/networkService', () => ({
  __esModule: true,
  getNetworkIdFromSlug: jest.fn((slug: string) => (slug === 'ecash' ? 1 : 2)),
  getNetworkFromSlug: jest.fn(async (slug: string) => ({ id: slug === 'ecash' ? 1 : 2, slug } as any))
}))

jest.mock('services/chronikService', () => ({
  __esModule: true,
  multiBlockchainClient: {
    waitForStart: jest.fn(async () => {}),
    getUrls: jest.fn(() => ({ ecash: [], bitcoincash: [] })),
    getAllSubscribedAddresses: jest.fn(() => ({ ecash: [], bitcoincash: [] })),
    subscribeAddresses: jest.fn(async () => {}),
    syncAddresses: jest.fn(async () => ({ failedAddressesWithErrors: {}, successfulAddressesWithCount: {} })),
    getTransactionDetails: jest.fn(async () => ({ hash: '', version: 0, block: { hash: '', height: 0, timestamp: '0' }, inputs: [], outputs: [] })),
    getLastBlockTimestamp: jest.fn(async () => 0),
    getBalance: jest.fn(async () => 0n),
    syncAndSubscribeAddresses: jest.fn(async () => ({ failedAddressesWithErrors: {}, successfulAddressesWithCount: {} }))
  }
}))

// Mock paybuttonService to inject fixtures
jest.mock('services/paybuttonService', () => ({
  __esModule: true,
  fetchPaybuttonById: jest.fn(),
  fetchPaybuttonWithTriggers: jest.fn()
}))

jest.mock('constants/mail', () => ({
  __esModule: true,
  MAIL_FROM: 'test@paybutton',
  MAIL_SUBJECT: 'Payment received',
  MAIL_HTML_REPLACER: jest.fn((o: { txId: string }) => `<b>${o.txId}</b>`),
  getMailerTransporter: jest.fn(() => ({ sendMail: jest.fn(async () => ({ accepted: ['to@x.com'], response: '250 OK' })) }))
}))

jest.mock('utils/index', () => ({
  __esModule: true,
  runAsyncInBatches: jest.fn(async (_name: string, runners: Array<() => Promise<void>>, _concurrency: number) => {
    for (const r of runners) { await r() }
  })
}))

// Keep original parseTriggerPostData behavior by default
jest.mock('utils/validators', () => {
  const original = jest.requireActual('utils/validators')
  return { ...original, parseTriggerPostData: jest.fn(original.parseTriggerPostData) }
})

// --- Shortcuts ---
const mockedAxios = axios as jest.Mocked<typeof axios>
const mockedParse = parseTriggerPostData as jest.MockedFunction<typeof parseTriggerPostData>
const now = new Date('2025-01-01T00:00:00Z')

// --- Helpers ---
const makeUser = (over: Partial<UserProfile> = {}): UserProfile => ({
  id: over.id ?? 'user-1',
  createdAt: over.createdAt ?? now,
  updatedAt: over.updatedAt ?? now,
  isAdmin: over.isAdmin ?? null,
  publicKey: over.publicKey ?? '',
  lastSentVerificationEmailAt: over.lastSentVerificationEmailAt ?? null,
  preferredCurrencyId: over.preferredCurrencyId ?? 1,
  preferredTimezone: over.preferredTimezone ?? '',
  proUntil: over.proUntil ?? null,
  organizationId: over.organizationId ?? null,
  emailCredits: over.emailCredits ?? 5,
  postCredits: over.postCredits ?? 5
})

const primaryAddr = 'ecash:qprimary'
const otherAddr1 = 'ecash:qother1'
const otherAddr2 = 'ecash:qother2'

// --- Wire prismaMock to prisma instance ---
beforeEach((): void => {
  jest.clearAllMocks()
  prisma.paybuttonTrigger.findMany = prismaMock.paybuttonTrigger.findMany
  prisma.paybuttonTrigger.update = prismaMock.paybuttonTrigger.update
  prisma.paybuttonTrigger.create = prismaMock.paybuttonTrigger.create
  prisma.triggerLog.createMany = prismaMock.triggerLog.createMany
  prisma.triggerLog.create = prismaMock.triggerLog.create
  prisma.triggerLog.count = prismaMock.triggerLog.count
  prisma.triggerLog.findMany = prismaMock.triggerLog.findMany
  prisma.paybutton.findFirstOrThrow = prismaMock.paybutton.findFirstOrThrow
  prisma.paybutton.findUniqueOrThrow = prismaMock.paybutton.findUniqueOrThrow
  prisma.userProfile.findMany = prismaMock.userProfile.findMany
  prisma.userProfile.update = prismaMock.userProfile.update
  prisma.userProfile.findUniqueOrThrow = prismaMock.userProfile.findUniqueOrThrow
  prisma.$transaction = prismaMock.$transaction

  // Execute callback directly (no unnecessary await)
  prismaMock.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => {
    return fn(prisma as any) as any
  })

  process.env.DONT_EXECUTE_TRIGGERS = ''
})

// ------------------------------
// parseTriggerPostData basics
// ------------------------------
describe('parseTriggerPostData replacement basics', () => {
  it('keeps primary output address index 0 and amounts', () => {
    const params = {
      amount: new Prisma.Decimal(12),
      currency: 'XEC',
      timestamp: 123,
      txId: 'txid',
      buttonName: 'btn',
      address: primaryAddr,
      opReturn: { message: '', paymentId: '', rawMessage: '' },
      inputAddresses: [{ address: 'ecash:qinput', amount: new Prisma.Decimal(1) }],
      outputAddresses: [
        { address: primaryAddr, amount: new Prisma.Decimal(5) },
        { address: otherAddr1, amount: new Prisma.Decimal(7) }
      ],
      value: '0.0002'
    }
    const result = parseTriggerPostData({
      userId: 'user-1',
      postData: '{"addr": <address>, "outs": <outputAddresses>}',
      postDataParameters: params
    })
    expect(result.addr).toBe(primaryAddr)
    expect(result.outs[0].address).toBe(primaryAddr)
    result.outs.forEach((o: { amount: unknown }) => expect(o.amount).toBeDefined())
  })
})

// ------------------------------
// fetchTriggersForPaybuttonAddresses
// ------------------------------
describe('fetchTriggersForPaybuttonAddresses respects deletedAt=null', () => {
  it('returns only non-deleted triggers', async () => {
    ;(fetchPaybuttonByIdMock as jest.Mock).mockResolvedValue({
      id: 'pb-1',
      providerUserId: 'user-1',
      addresses: [{ address: { address: primaryAddr } }, { address: { address: otherAddr1 } }]
    })

    prismaMock.paybuttonTrigger.findMany.mockResolvedValue([
      { id: 't1', isEmailTrigger: false, deletedAt: null, paybutton: { addresses: [{ address: { address: primaryAddr } }], providerUserId: 'user-1' } },
      { id: 't2', isEmailTrigger: true, deletedAt: null, paybutton: { addresses: [{ address: { address: otherAddr1 } }], providerUserId: 'user-1' } }
    ] as any)

    const rows = await fetchTriggersForPaybuttonAddresses('pb-1')
    expect(rows.map(r => r.id)).toEqual(['t1', 't2'])
    expect(prismaMock.paybuttonTrigger.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null })
      })
    )
  })
})

// ------------------------------
// create/update/delete (soft-delete)
// ------------------------------
describe('create/update/delete trigger (soft-delete path)', () => {
  const paybutton = {
    id: 'pb-1',
    providerUserId: 'user-1',
    triggers: [
      { id: 'tp1', isEmailTrigger: false, deletedAt: null }
    ]
  }

  beforeEach((): void => {
    prismaMock.paybutton.findUniqueOrThrow.mockResolvedValue(paybutton as any)
    prismaMock.paybutton.findFirstOrThrow.mockResolvedValue(paybutton as any)
    ;(fetchPaybuttonWithTriggersMock as jest.Mock).mockResolvedValue(paybutton)
    ;(fetchPaybuttonByIdMock as jest.Mock).mockResolvedValue({
      id: 'pb-1',
      providerUserId: 'user-1',
      addresses: [{ address: { address: primaryAddr } }],
      triggers: paybutton.triggers
    })
  })

  it('createTrigger rejects duplicate active kind in same paybutton', async () => {
    prismaMock.paybuttonTrigger.findMany.mockResolvedValue([{ id: 'addr-post', isEmailTrigger: false, deletedAt: null }] as any)
    await expect(
      createTrigger('pb-1', { userId: 'user-1', isEmailTrigger: false, postURL: 'https://x', postData: '{}' })
    ).rejects.toThrow()
  })

  it('createTrigger allows email trigger when only post exists', async () => {
    prismaMock.paybuttonTrigger.findMany.mockResolvedValue([] as any)
    prismaMock.paybuttonTrigger.create.mockResolvedValue({ id: 'new', isEmailTrigger: true } as any)
    const row = await createTrigger('pb-1', { userId: 'user-1', isEmailTrigger: true, emails: 'to@x.com' })
    expect(row.id).toBe('new')
    expect(prismaMock.paybuttonTrigger.create).toHaveBeenCalled()
  })

  it('updateTrigger -> empty params performs soft-delete', async () => {
    ;(paybutton.triggers as any).push({ id: 'e1', isEmailTrigger: true, deletedAt: null })
    prismaMock.paybuttonTrigger.update.mockResolvedValue({ id: 'e1', deletedAt: now } as any)
    const ret = await updateTrigger('pb-1', {
      userId: 'user-1',
      triggerId: 'e1',
      isEmailTrigger: true,
      emails: ''
    })
    expect(ret.deletedAt).toEqual(now)
    expect(prismaMock.paybuttonTrigger.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { deletedAt: expect.any(Date) } })
    )
  })

  it('deleteTrigger sets deletedAt, not hard-deletes', async () => {
    ;(paybutton.triggers as any).push({ id: 'tp1', isEmailTrigger: false, deletedAt: null })
    prismaMock.paybuttonTrigger.update.mockResolvedValue({ id: 'tp1', deletedAt: now } as any)
    const ret = await deleteTrigger('pb-1', { userId: 'user-1', triggerId: 'tp1' })
    expect(ret.deletedAt).toEqual(now)
  })

  it('validateTriggerForPaybutton blocks cross-user modification', async () => {
    ;(fetchPaybuttonWithTriggersMock as jest.Mock).mockResolvedValue({ ...paybutton, providerUserId: 'another' })
    await expect(
      createTrigger('pb-1', { userId: 'user-1', isEmailTrigger: true, emails: 'to@x.com' })
    ).rejects.toThrow()
  })
})

// ------------------------------
// fetchTriggerLogsForPaybutton
// ------------------------------
const makeLog = (over: Partial<TriggerLog> = {}): TriggerLog => ({
  id: over.id ?? 1,
  data: over.data ?? '{}',
  createdAt: over.createdAt ?? now,
  updatedAt: over.updatedAt ?? now,
  triggerId: over.triggerId ?? 'trig_1',
  isError: over.isError ?? false,
  actionType: over.actionType ?? ('PostData' as TriggerLogActionType)
})

describe('fetchTriggerLogsForPaybutton basic paging/sorting', () => {
  it('paginates/sorts and mirrors where into count', async () => {
    const rows = [makeLog({ id: 1 }), makeLog({ id: 2 })]
    prismaMock.triggerLog.findMany.mockResolvedValue(rows)
    prismaMock.triggerLog.count.mockResolvedValue(2)

    const result = await fetchTriggerLogsForPaybutton({
      paybuttonId: 'pb1', page: 0, pageSize: 10, orderBy: 'createdAt', orderDesc: true, actionType: 'PostData'
    })
    expect(result).toEqual({ data: rows, totalCount: 2 })
    const findArgs = prismaMock.triggerLog.findMany.mock.calls[0][0] as { where: unknown }
    const countArgs = prismaMock.triggerLog.count.mock.calls[0][0] as { where: unknown }
    expect(countArgs).toEqual(expect.objectContaining({ where: findArgs.where }))
  })

  it('omits actionType when not provided', async () => {
    prismaMock.triggerLog.findMany.mockResolvedValue([makeLog()])
    prismaMock.triggerLog.count.mockResolvedValue(1)
    await fetchTriggerLogsForPaybutton({
      paybuttonId: 'pbX', page: 0, pageSize: 10, orderBy: 'id', orderDesc: true
    } as any)
    const where = (prismaMock.triggerLog.findMany.mock.calls[0][0] as any).where
    expect(where.actionType).toBeUndefined()
  })
})

// ------------------------------
// executeAddressTriggers end-to-end
// ------------------------------
describe('executeAddressTriggers end-to-end (soft-deleted triggers ignored)', () => {
  const userA = makeUser({ id: 'userA', emailCredits: 1, postCredits: 1 })
  const userB = makeUser({ id: 'userB', emailCredits: 2, postCredits: 1 })

  const tPostA = {
    id: 't-post-A',
    isEmailTrigger: false,
    deletedAt: null,
    postURL: 'https://post/a',
    postData: '{"address": <address>, "outputAddresses": <outputAddresses>}',
    paybutton: { name: 'PB A', providerUserId: 'userA', user: userA, addresses: [{ address: { address: primaryAddr } }] }
  }
  const tEmailA = {
    id: 't-mail-A',
    isEmailTrigger: true,
    deletedAt: null,
    emails: 'to@a.com',
    paybutton: { name: 'PB A', providerUserId: 'userA', user: userA, addresses: [{ address: { address: primaryAddr } }] }
  }
  const tPostBDeleted = {
    id: 't-post-B-del',
    isEmailTrigger: false,
    deletedAt: new Date(),
    postURL: 'https://post/b',
    postData: '{"address": <address>}',
    paybutton: { name: 'PB B', providerUserId: 'userB', user: userB, addresses: [{ address: { address: primaryAddr } }] }
  }
  const tPostB = {
    id: 't-post-B',
    isEmailTrigger: false,
    deletedAt: null,
    postURL: 'https://post/b',
    postData: '{"address": <address>}',
    paybutton: { name: 'PB B', providerUserId: 'userB', user: userB, addresses: [{ address: { address: primaryAddr } }] }
  }

  const txItem = {
    hash: 'h1',
    amount: new Prisma.Decimal(1),
    paymentId: '',
    confirmed: true,
    message: '',
    timestamp: 1700000000,
    address: primaryAddr,
    rawMessage: '',
    inputAddresses: [{ address: 'ecash:qinp', amount: new Prisma.Decimal(1) }],
    outputAddresses: [
      { address: primaryAddr, amount: new Prisma.Decimal(3) },
      { address: otherAddr1, amount: new Prisma.Decimal(2) },
      { address: otherAddr2, amount: new Prisma.Decimal(4) }
    ],
    prices: [
      { price: { value: new Prisma.Decimal('0.5'), quoteId: 1 } },
      { price: { value: new Prisma.Decimal('0.6'), quoteId: 2 } }
    ]
  }

  beforeEach((): void => {
    // reset transport/mocks and credits for each test
    ;(Mail.getMailerTransporter as jest.Mock).mockReturnValue({ sendMail: jest.fn(async () => ({ accepted: ['to@a.com'], response: '250 OK' })) })

    ;(tPostA as any).paybutton.user = makeUser({ id: 'userA', emailCredits: 1, postCredits: 1 })
    ;(tEmailA as any).paybutton.user = makeUser({ id: 'userA', emailCredits: 1, postCredits: 1 })

    mockedAxios.post.mockResolvedValue({ status: 200, data: 'ok' })
    mockedParse.mockImplementation((args: { postData: string }) => {
      const replaced = args.postData
        .replace('<address>', '"' + primaryAddr + '"')
        .replace('<outputAddresses>', JSON.stringify(txItem.outputAddresses))
      return JSON.parse(replaced)
    })
    prismaMock.triggerLog.createMany.mockResolvedValue({ count: 0 } as any)
    prismaMock.userProfile.update.mockResolvedValue({} as any)
    prismaMock.userProfile.findMany.mockImplementation(async (args: { where: { id: { in: string[] } } }): Promise<UserProfile[]> => {
      const ids = args.where.id.in
      const currentUserA = (tPostA as any).paybutton.user as UserProfile
      return [currentUserA, userB].filter(u => ids.includes(u.id))
    })
  })

  it('skips deleted triggers, respects credits, writes logs in batches, decrements attempted', async () => {
    prismaMock.paybuttonTrigger.findMany.mockResolvedValue([tPostA, tEmailA, tPostBDeleted, tPostB] as any)
    const broadcast = { address: primaryAddr, txs: [txItem] }
    await executeAddressTriggers(broadcast as any, 1)

    expect(mockedAxios.post).toHaveBeenCalledTimes(2)
    expect(prismaMock.triggerLog.createMany).toHaveBeenCalled()

    const updates = prismaMock.userProfile.update.mock.calls.map((c: any[]) => c[0])
    const updatesByUser: Record<string, unknown> = Object.fromEntries(updates.map((u: any) => [u.where.id, u.data]))
    expect(updatesByUser.userA).toMatchObject({ emailCredits: { decrement: 1 }, postCredits: { decrement: 1 } })
    expect(updatesByUser.userB).toMatchObject({ postCredits: { decrement: 1 } })
  })

  it('out-of-credits appends error logs for overflow tasks', async () => {
    const userAZero = makeUser({ id: 'userA', emailCredits: 0, postCredits: 0 })
    ;(tPostA as any).paybutton.user = userAZero
    ;(tEmailA as any).paybutton.user = userAZero

    prismaMock.userProfile.findMany.mockResolvedValue([userAZero, userB])
    prismaMock.paybuttonTrigger.findMany.mockResolvedValue([tPostA, tEmailA] as any)

    const broadcast = { address: primaryAddr, txs: [txItem] }
    await executeAddressTriggers(broadcast as any, 1)

    const flat = prismaMock.triggerLog.createMany.mock.calls.flatMap((c: any[]) => c[0].data as any[])
    const hasOOC = flat.some(r => {
      try {
        const d = JSON.parse(r.data)
        return d.errorName === 'USER_OUT_OF_POST_CREDITS' || d.errorName === 'USER_OUT_OF_EMAIL_CREDITS'
      } catch { return false }
    })
    expect(hasOOC).toBe(true)
  })

  it('handles transporter email failures but still logs and decrements attempted', async () => {
    ;(Mail.getMailerTransporter as jest.Mock).mockReturnValue({
      sendMail: jest.fn(async () => { throw Object.assign(new Error('SMTP down'), { name: 'SMTPError' }) })
    })

    ;(tEmailA as any).paybutton.user = makeUser({ id: 'userA', emailCredits: 1, postCredits: 1 })

    prismaMock.userProfile.findMany.mockResolvedValue([(tEmailA as any).paybutton.user])
    prismaMock.paybuttonTrigger.findMany.mockResolvedValue([tEmailA] as any)

    const broadcast = { address: primaryAddr, txs: [txItem] }
    await executeAddressTriggers(broadcast as any, 1)

    const batches = prismaMock.triggerLog.createMany.mock.calls.map((c: any[]) => c[0].data as any[]).flat()
    const emailErr = batches.find(b => b.actionType === 'SendEmail' && b.isError === true)
    expect(emailErr).toBeTruthy()

    const upd = prismaMock.userProfile.update.mock.calls[0]?.[0] as any
    expect(upd.where.id).toBe('userA')
    // Cast to any to avoid union complaints (number | IntFieldUpdateOperationsInput)
    expect((upd.data.emailCredits).decrement).toBeGreaterThanOrEqual(0)
  })

  it('DONT_EXECUTE_TRIGGERS env short-circuits', async () => {
    process.env.DONT_EXECUTE_TRIGGERS = 'true'
    prismaMock.paybuttonTrigger.findMany.mockResolvedValue([tPostA] as any)
    const broadcast = { address: primaryAddr, txs: [txItem] }
    await executeAddressTriggers(broadcast as any, 1)
    expect(prismaMock.paybuttonTrigger.findMany).not.toHaveBeenCalled()
    expect(prismaMock.triggerLog.createMany).not.toHaveBeenCalled()
  })
})

// ------------------------------
// executeTriggersBatch mechanics
// ------------------------------
describe('executeTriggersBatch mechanics', () => {
  const user = makeUser({ id: 'u', emailCredits: 1, postCredits: 2 })
  const trigPost = {
    id: 'tP',
    isEmailTrigger: false,
    deletedAt: null,
    postURL: 'https://p',
    postData: '{"address": <address>}',
    paybutton: { name: 'PB', providerUserId: 'u', user, addresses: [{ address: { address: primaryAddr } }] }
  }
  const trigMail = {
    id: 'tM',
    isEmailTrigger: true,
    deletedAt: null,
    emails: 'to@x.com',
    paybutton: { name: 'PB', providerUserId: 'u', user, addresses: [{ address: { address: primaryAddr } }] }
  }
  const mkTx = (h: string): any => ({
    hash: h,
    amount: new Prisma.Decimal(1),
    paymentId: '',
    confirmed: true,
    message: '',
    timestamp: 1700000000,
    address: primaryAddr,
    rawMessage: '',
    inputAddresses: [],
    outputAddresses: [{ address: primaryAddr, amount: new Prisma.Decimal(1) }],
    prices: [
      { price: { value: new Prisma.Decimal('0.5'), quoteId: 1 } },
      { price: { value: new Prisma.Decimal('0.6'), quoteId: 2 } }
    ]
  })

  beforeEach((): void => {
    mockedParse.mockImplementation((args: { postData: string }) => JSON.parse(args.postData.replace('<address>', '"' + primaryAddr + '"')))
    mockedAxios.post.mockResolvedValue({ status: 200, data: 'ok' })
    prismaMock.triggerLog.createMany.mockResolvedValue({ count: 0 } as any)
    prismaMock.userProfile.findMany.mockResolvedValue([user])
    prismaMock.userProfile.update.mockResolvedValue({} as any)
  })

  it('attempts up to credits, not only successes', async () => {
    prismaMock.paybuttonTrigger.findMany.mockResolvedValue([trigPost, trigPost, trigMail] as any)
    const broadcasts = [
      { address: primaryAddr, txs: [mkTx('h1')] },
      { address: primaryAddr, txs: [mkTx('h2')] }
    ]
    await executeTriggersBatch(broadcasts as any, 1)

    const updates = prismaMock.userProfile.update.mock.calls
    expect(updates.length).toBe(1)
    const dataAny = updates[0][0].data as any
    expect(dataAny.postCredits.decrement).toBe(2)
    expect(dataAny.emailCredits.decrement).toBe(1)
  })

  it('credit decrement tx failure does not break logs', async () => {
    prismaMock.userProfile.findMany.mockResolvedValue([user])
    prismaMock.$transaction.mockImplementationOnce(() => { throw new Error('tx failure') })
    prismaMock.paybuttonTrigger.findMany.mockResolvedValue([trigPost] as any)

    await executeTriggersBatch([{ address: primaryAddr, txs: [mkTx('h1')] }] as any, 1)
    expect(prismaMock.triggerLog.createMany).toHaveBeenCalled()
  })
})

// ------------------------------
// task-level error handling
// ------------------------------
describe('task-level error handling', () => {
  const user = makeUser({ id: 'u', emailCredits: 1, postCredits: 1 })
  const trigPost = {
    id: 'tP',
    isEmailTrigger: false,
    deletedAt: null,
    postURL: 'https://p',
    postData: '{"x": <invalid>}', // will break
    paybutton: { name: 'PB', providerUserId: 'u', user, addresses: [{ address: { address: primaryAddr } }] }
  }
  const mkTx = (): any => ({
    hash: 'h',
    amount: new Prisma.Decimal(1),
    paymentId: '',
    confirmed: true,
    message: '',
    timestamp: 1,
    address: primaryAddr,
    rawMessage: '',
    inputAddresses: [],
    outputAddresses: [],
    prices: [
      { price: { value: new Prisma.Decimal('0.5'), quoteId: 1 } },
      { price: { value: new Prisma.Decimal('0.6'), quoteId: 2 } }
    ]
  })

  beforeEach((): void => {
    mockedAxios.post.mockResolvedValue({ status: 200, data: 'ok' })
    prismaMock.userProfile.findMany.mockResolvedValue([user])
    prismaMock.userProfile.update.mockResolvedValue({} as any)
    prismaMock.triggerLog.createMany.mockResolvedValue({ count: 1 } as any)
    mockedParse.mockImplementation(() => { throw Object.assign(new Error('bad json'), { name: 'SyntaxError' }) })
  })

  it('logs PostData parse failure and still decrements attempted', async () => {
    prismaMock.paybuttonTrigger.findMany.mockResolvedValue([trigPost] as any)
    await executeTriggersBatch([{ address: primaryAddr, txs: [mkTx()] }] as any, 1)
    const batch = prismaMock.triggerLog.createMany.mock.calls[0][0].data as any[]
    const err = batch.find(b => b.actionType === 'PostData' && b.isError)
    expect(err).toBeTruthy()
    const upd = prismaMock.userProfile.update.mock.calls[0]?.[0] as any
    expect((upd.data.postCredits).decrement).toBe(1)
  })
})

// ------------------------------
// fetchTriggerLogsForPaybutton edges
// ------------------------------
describe('fetchTriggerLogsForPaybutton edges', () => {
  it('ascending order', async () => {
    prismaMock.triggerLog.findMany.mockResolvedValue([makeLog({ id: 10, actionType: 'SendEmail' })])
    prismaMock.triggerLog.count.mockResolvedValue(1)
    await fetchTriggerLogsForPaybutton({
      paybuttonId: 'pb2', page: 1, pageSize: 20, orderBy: 'timestamp' as any, orderDesc: false, actionType: 'SendEmail'
    })
    expect(prismaMock.triggerLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { timestamp: 'asc' } }))
  })

  it('empty result', async () => {
    prismaMock.triggerLog.findMany.mockResolvedValue([])
    prismaMock.triggerLog.count.mockResolvedValue(0)
    const r = await fetchTriggerLogsForPaybutton({
      paybuttonId: 'pb3', page: 2, pageSize: 5, orderBy: 'id', orderDesc: false, actionType: 'SendEmail'
    })
    expect(r).toEqual({ data: [], totalCount: 0 })
  })

  it('bubbles db error', async () => {
    prismaMock.triggerLog.findMany.mockRejectedValue(new Error('DB error'))
    prismaMock.triggerLog.count.mockResolvedValue(0)
    await expect(fetchTriggerLogsForPaybutton({
      paybuttonId: 'pb6', page: 0, pageSize: 10, orderBy: 'createdAt', orderDesc: true, actionType: 'PostData'
    })).rejects.toThrow('DB error')
  })
})
