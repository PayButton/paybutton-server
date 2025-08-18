// Mock heavy deps before imports
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
    triggerPOSTTimeout: 3000
  }
}))

describe('Payment Trigger system', () => {
  beforeAll(() => {
    process.env.MASTER_SECRET_KEY = process.env.MASTER_SECRET_KEY ?? 'test-secret'
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('parseTriggerPostData replaces <outputAddresses> and <address>, keeping index 0 as the primary address', () => {
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
      inputAddresses: ['ecash:qqkv9wr69ry2p9l53lxp635va4h86wv435995w8p2h'],
      outputAddresses: [primaryAddress, other],
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
    expect(result.outs[0]).toBe(primaryAddress)
    expect(result.outs).toEqual([primaryAddress, other])
  })

  it('executeAddressTriggers posts with outputAddresses containing primary at index 0', async () => {
    const primaryAddress = 'ecash:qz3ye4namaqlca8zgvdju8uqa2wwx8twd5y8wjd9ru'
    const other1 = 'ecash:qrju9pgzn3m84q57ldjvxph30zrm8q7dlc8r8a3eyp'
    const other2 = 'ecash:qrcn673f42dl4z8l3xpc0gr5kpxg7ea5mqhj3atxd3'

    prismaMock.paybuttonTrigger.findMany.mockResolvedValue([
      {
        id: 'trigger-1',
        isEmailTrigger: false,
        postURL: 'http://example.com/webhook',
        postData: '{"address": <address>, "outputAddresses": <outputAddresses>}',
        paybutton: {
          name: 'My Paybutton',
          providerUserId: 'user-1'
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
          inputAddresses: ['ecash:qqkv9wr69ry2p9l53lxp635va4h86wv435995w8p2h'],
          outputAddresses: [other1, primaryAddress, other2],
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
    expect(postedBody.outputAddresses[0]).toBe(primaryAddress)
    expect(postedBody.outputAddresses).toEqual([primaryAddress, other1, other2])
  })
})
