// Mock heavy deps before importing modules that depend on them
// Now import modules under test
import axios from 'axios'
import { Prisma } from '@prisma/client'
import prisma from 'prisma-local/clientInstance'
import { prismaMock } from 'prisma-local/mockedClient'
import { executeAddressTriggers } from 'services/triggerService'
import { parseTriggerPostData } from 'utils/validators'

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn()
  }
}))

jest.mock('config', () => ({
  __esModule: true,
  default: {
    triggerPOSTTimeout: 3000,
    networkBlockchainURLs: {
      ecash: ['https://xec.paybutton.org'],
      bitcoincash: ['https://bch.paybutton.org']
    },
    wsBaseURL: 'localhost:5000'
  }
}))

// Also mock networkService to prevent it from importing and instantiating chronikService via relative path
jest.mock('services/networkService', () => ({
  __esModule: true,
  getNetworkIdFromSlug: jest.fn((slug: string) => 1),
  getNetworkFromSlug: jest.fn(async (slug: string) => ({ id: 1, slug } as any))
}))

// Prevent real Chronik client initialization during this test suite
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

describe('Payment Trigger system', () => {
  beforeAll(() => {
    process.env.MASTER_SECRET_KEY = process.env.MASTER_SECRET_KEY ?? 'test-secret'
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('parseTriggerPostData replaces <outputAddresses> and <address>, keeping index 0 as the primary address and preserves amounts', () => {
    const primaryAddress = 'ecash:qz3ye4namaqlca8zgvdju8uqa2wwx8twd5y8wjd9ru'
    const other = 'ecash:qrju9pgzn3m84q57ldjvxph30zrm8q7dlc8r8a3eyp'

    const params = {
      amount: new Prisma.Decimal(12),
      currency: 'XEC',
      timestamp: 123456789,
      txId: 'mocked-txid',
      buttonName: 'Button Name',
      address: primaryAddress,
      opReturn: { message: '', paymentId: '', rawMessage: '' },
      inputAddresses: [{ address: 'ecash:qqkv9wr69ry2p9l53lxp635va4h86wv435995w8p2h', amount: new Prisma.Decimal(1) }],
      outputAddresses: [
        { address: primaryAddress, amount: new Prisma.Decimal(5) },
        { address: other, amount: new Prisma.Decimal(7) }
      ],
      value: '0.0002'
    }

    const postData = '{"addr": <address>, "outs": <outputAddresses>}'
    const result = parseTriggerPostData({
      userId: 'user-1',
      postData,
      postDataParameters: params
    })

    expect(result.addr).toBe(primaryAddress)
    expect(Array.isArray(result.outs)).toBe(true)
    expect(result.outs[0].address).toBe(primaryAddress)
    expect(result.outs.map((o: any) => o.address)).toEqual([primaryAddress, other])
    // ensure amounts are present
    result.outs.forEach((o: any) => expect(o.amount).toBeDefined())
  })

  it('executeAddressTriggers posts with outputAddresses containing primary at index 0', async () => {
    const primaryAddress = 'ecash:qz3ye4namaqlca8zgvdju8uqa2wwx8twd5y8wjd9ru'
    const other1 = 'ecash:qrju9pgzn3m84q57ldjvxph30zrm8q7dlc8r8a3eyp'
    const other2 = 'ecash:qrcn673f42dl4z8l3xpc0gr5kpxg7ea5mqhj3atxd3'

    prismaMock.paybuttonTrigger.findMany.mockResolvedValue([
      {
        id: 'trigger-1',
        isEmailTrigger: false,
        postURL: 'https://httpbin.org/post',
        postData: '{"address": <address>, "outputAddresses": <outputAddresses>}',
        paybutton: {
          name: 'My Paybutton',
          addresses: [
            {
              address: {
                address: primaryAddress
              }
            }
          ],
          providerUserId: 'user-1',
          user: {
            id: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            publicKey: '',
            emailCredits: 1,
            postCredits: 1,
            preferredCurrencyId: 1
          }
        }
      } as any
    ])
    prisma.paybuttonTrigger.findMany = prismaMock.paybuttonTrigger.findMany

    prismaMock.paybutton.findFirstOrThrow.mockResolvedValue({ providerUserId: 'user-1' } as any)
    prisma.paybutton.findFirstOrThrow = prismaMock.paybutton.findFirstOrThrow

    prismaMock.userProfile.findUniqueOrThrow.mockResolvedValue({ id: 'user-1', preferredCurrencyId: 1 } as any)
    prisma.userProfile.findUniqueOrThrow = prismaMock.userProfile.findUniqueOrThrow

    prismaMock.triggerLog.create.mockResolvedValue({} as any)
    prisma.triggerLog.create = prismaMock.triggerLog.create

    ;(axios as any).post.mockResolvedValue({ data: 'ok' })

    const broadcastTxData = {
      address: primaryAddress,
      messageType: 'NewTx',
      txs: [
        {
          hash: 'mocked-hash',
          amount: new Prisma.Decimal(1),
          paymentId: '',
          confirmed: true,
          message: '',
          timestamp: 1700000000,
          address: primaryAddress,
          rawMessage: '',
          inputAddresses: [{ address: 'ecash:qqkv9wr69ry2p9l53lxp635va4h86wv435995w8p2h', amount: new Prisma.Decimal(1) }],
          outputAddresses: [
            { address: other1, amount: new Prisma.Decimal(2) },
            { address: primaryAddress, amount: new Prisma.Decimal(3) },
            { address: other2, amount: new Prisma.Decimal(4) }
          ],
          prices: [
            { price: { value: new Prisma.Decimal('0.5'), quoteId: 1 } },
            { price: { value: new Prisma.Decimal('0.6'), quoteId: 2 } }
          ]
        }
      ]
    }

    await executeAddressTriggers(broadcastTxData as any, 1)

    expect((axios as any).post).toHaveBeenCalledTimes(1)
    const postedBody = (axios as any).post.mock.calls[0][1]

    expect(postedBody.address).toBe(primaryAddress)
    expect(Array.isArray(postedBody.outputAddresses)).toBe(true)
    expect(postedBody.outputAddresses[0].address).toBe(primaryAddress)
    expect(postedBody.outputAddresses.map((o: any) => o.address)).toEqual([primaryAddress, other1, other2])
    // Ensure amounts carried over as decimals (stringifiable)
    postedBody.outputAddresses.forEach((o: any) => {
      expect(o.amount).toBeDefined()
    })
  })
})
