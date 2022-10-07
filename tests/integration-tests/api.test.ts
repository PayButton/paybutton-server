import { RequestOptions, RequestMethod } from 'node-mocks-http'
import paybuttonsEndpoint from 'pages/api/paybuttons/index'
import paybuttonEndpoint from 'pages/api/paybutton/index'
import paybuttonIdEndpoint from 'pages/api/paybutton/[id]'
import transactionsEndpoint from 'pages/api/transactions/[address]'
import transactionDetailsEndpoint from 'pages/api/transaction/[transactionId]'
import balanceEndpoint from 'pages/api/balance/[address]'
import dashboardEndpoint from 'pages/api/dashboard/index'
import {
  exampleAddresses,
  testEndpoint,
  clearPaybuttonsAndAddresses,
  createPaybuttonForUser,
  countPaybuttons,
  countAddresses
} from 'tests/utils'

import { RESPONSE_MESSAGES } from 'constants/index'

jest.mock('../../utils/setSession', () => {
  return {
    setSession: (req: any, res: any) => {
      req.session = { userId: 'test-u-id' }
    }
  }
})

afterAll(async () => {
  await clearPaybuttonsAndAddresses()
})

describe('POST /api/paybutton/', () => {
  beforeAll(async () => {
    await clearPaybuttonsAndAddresses()
  })
  const baseRequestOptions: RequestOptions = {
    method: 'POST' as RequestMethod,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      addresses: `${exampleAddresses.ecash}\nbitcoincash:${exampleAddresses.bitcoincash}`,
      name: 'test-paybutton',
      buttonData: '{"somefield":"somevalue"}'
    }
  }

  it('Create a paybutton with two addresses', async () => {
    const res = await testEndpoint(baseRequestOptions, paybuttonEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(200)
    expect(responseData.providerUserId).toBe('test-u-id')
    expect(responseData.name).toBe('test-paybutton')
    expect(responseData.buttonData).toBe('{"somefield":"somevalue"}')
    expect(responseData.uuid).not.toBeNull()
    expect(responseData.addresses).toEqual(
      expect.arrayContaining([
        {
          address: expect.objectContaining({
            address: `ecash:${exampleAddresses.ecash}`
          })
        },
        {
          address:
          expect.objectContaining({
            address: `bitcoincash:${exampleAddresses.bitcoincash}`
          })
        }
      ])
    )
    void expect(countPaybuttons()).resolves.toBe(1)
    void expect(countAddresses()).resolves.toBe(2)
  })

  it('Create a paybutton empty JSON for buttonData', async () => {
    baseRequestOptions.body = {
      name: 'test-paybutton-no-button-data',
      addresses: `ectest:${exampleAddresses.ectest}`
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(200)
    expect(responseData.providerUserId).toBe('test-u-id')
    expect(responseData.name).toBe('test-paybutton-no-button-data')
    expect(responseData.buttonData).toBe('{}')
    expect(responseData.addresses).toEqual(
      expect.arrayContaining([
        {
          address: expect.objectContaining({
            address: `ectest:${exampleAddresses.ectest}`
          })
        }
      ])
    )
  })

  it('Should fail without name', async () => {
    baseRequestOptions.body = {
      userId: 'test-u-id',
      name: '',
      addresses: `ecash:${exampleAddresses.ecash}\nbitcoincash:${exampleAddresses.bitcoincash}`
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonEndpoint)
    expect(res.statusCode).toBe(400)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
  })

  it('Should fail with repeated name', async () => {
    baseRequestOptions.body = {
      userId: 'test-u-id',
      name: 'test-paybutton',
      addresses: `ecash:${exampleAddresses.ecash}\nbitcoincash:${exampleAddresses.bitcoincash}`
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonEndpoint)
    expect(res.statusCode).toBe(400)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.PAYBUTTON_NAME_ALREADY_EXISTS_400.message)
  })

  it('Fail without addresses', async () => {
    baseRequestOptions.body = {
      userId: 'test-u-id',
      name: 'test-paybutton',
      addresses: ''
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonEndpoint)
    expect(res.statusCode).toBe(400)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message)
  })

  it('Fail with invalid addresses', async () => {
    baseRequestOptions.body = {
      userId: 'test-u-id',
      name: 'test-paybutton',
      addresses: 'ecash:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\nbitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonEndpoint)
    expect(res.statusCode).toBe(400)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  })

  it('Fail with invalid buttonData', async () => {
    baseRequestOptions.body = {
      userId: 'test-u-id',
      name: 'test-paybutton',
      addresses: `ecash:${exampleAddresses.ecash}\nbitcoincash:${exampleAddresses.bitcoincash}`,
      buttonData: '{invalidjson'
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonEndpoint)
    expect(res.statusCode).toBe(400)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.INVALID_BUTTON_DATA_400.message)
  })
})

describe('GET /api/paybuttons/', () => {
  // Create 4 paybuttons, 3 for one user and 1 for another.
  const userA = 'test-u-id'
  const userB = 'test-other-u-id'
  beforeAll(async () => {
    await clearPaybuttonsAndAddresses()
    for (let i = 0; i < 4; i++) {
      const userId = i === 3 ? userB : userA
      await createPaybuttonForUser(userId)
    }
  })

  const baseRequestOptions: RequestOptions = {
    method: 'GET' as RequestMethod,
    query: {
      userId: userA
    }
  }

  it('Get 3 paybuttons for userA', async () => {
    const res = await testEndpoint(baseRequestOptions, paybuttonsEndpoint)
    expect(res.statusCode).toBe(200)
    const responseData = res._getJSONData()
    expect(responseData[0].providerUserId).toBe(userA)
    expect(responseData.length).toBe(3)
  })

  it('Get 1 paybuttons for userB', async () => {
    baseRequestOptions.query = {
      userId: userB
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonsEndpoint)
    expect(res.statusCode).toBe(200)
    const responseData = res._getJSONData()
    expect(responseData[0].providerUserId).toBe(userB)
    expect(responseData.length).toBe(1)
    expect(responseData[0].addresses).toEqual(
      expect.arrayContaining([
        {
          address: expect.objectContaining({
            address: expect.any(String)
          })
        },
        {
          address: expect.objectContaining({
            address: expect.any(String)
          })
        }
      ])
    )
    expect(responseData[0]).toHaveProperty('providerUserId')
    expect(responseData[0]).toHaveProperty('name')
    expect(responseData[0]).toHaveProperty('buttonData')
    expect(responseData[0]).toHaveProperty('uuid')
  })

  it('Get no paybuttons for unknown user', async () => {
    baseRequestOptions.query = {
      userId: 'unknown-user'
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonsEndpoint)
    expect(res.statusCode).toBe(200)
    const responseData = res._getJSONData()
    expect(responseData.length).toBe(0)
  })

  it('Fail without userId', async () => {
    baseRequestOptions.query = {
      userId: ''
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonsEndpoint)
    expect(res.statusCode).toBe(400)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  })

  it('Fail with multiple userIds', async () => {
    baseRequestOptions.query = {
      userId: ['test-u-id', 'test-other-u-id']
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonsEndpoint)
    expect(res.statusCode).toBe(400)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.MULTIPLE_USER_IDS_PROVIDED_400.message)
  })
})

describe('GET /api/paybutton/[id]', () => {
  // Create 4 paybuttons, 3 for one user and 1 for another.
  const userA = 'test-u-id'
  const userB = 'test-other-u-id'
  let createdPaybuttonsIds: number[]
  beforeAll(async () => {
    await clearPaybuttonsAndAddresses()
    createdPaybuttonsIds = []
    for (let i = 0; i < 4; i++) {
      const userId = i === 3 ? userB : userA
      const paybutton = await createPaybuttonForUser(userId)
      createdPaybuttonsIds.push(paybutton.id)
    }
  })

  const baseRequestOptions: RequestOptions = {
    method: 'GET' as RequestMethod,
    query: {}
  }

  it('Find paybutton for created ids', async () => {
    for (const id of createdPaybuttonsIds) {
      if (baseRequestOptions.query != null) baseRequestOptions.query.id = id
      const res = await testEndpoint(baseRequestOptions, paybuttonIdEndpoint)
      const responseData = res._getJSONData()
      expect(res.statusCode).toBe(200)
      expect(responseData.addresses).toEqual(
        expect.arrayContaining([
          {
            address: expect.objectContaining({
              address: expect.any(String)
            })
          },
          {
            address: expect.objectContaining({
              address: expect.any(String)
            })
          }
        ])
      )
      expect(responseData).toHaveProperty('providerUserId')
      expect(responseData).toHaveProperty('name')
      expect(responseData).toHaveProperty('buttonData')
      expect(responseData).toHaveProperty('uuid')
    }
  })

  it('Not find paybutton for next id', async () => {
    const nextId = createdPaybuttonsIds[createdPaybuttonsIds.length - 1] + 1
    if (baseRequestOptions.query != null) baseRequestOptions.query.id = nextId
    const res = await testEndpoint(baseRequestOptions, paybuttonIdEndpoint)
    expect(res.statusCode).toBe(404)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.NOT_FOUND_404.message)
  })
})

describe('GET /api/transactions/[address]', () => {
  const baseRequestOptions: RequestOptions = {
    method: 'GET' as RequestMethod,
    headers: {
      'Content-Type': 'application/json'
    },
    query: {}
  }

  it('Should return HTTP 400 (Bad Request) if no address specified', async () => {
    const res = await testEndpoint(baseRequestOptions, transactionsEndpoint)
    expect(res.statusCode).toBe(RESPONSE_MESSAGES.ADDRESS_NOT_PROVIDED_400.statusCode)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.ADDRESS_NOT_PROVIDED_400.message)
  })

  it('Should return HTTP 200 in case address is valid but not yet on the system', async () => {
    const baseRequestOptions: RequestOptions = {
      method: 'GET' as RequestMethod,
      headers: {
        'Content-Type': 'application/json'
      },
      query: {
        address: `ecash:${exampleAddresses.ecash}`
      }
    }
    const res = await testEndpoint(baseRequestOptions, transactionsEndpoint)
    expect(res.statusCode).toBe(200)
  })
})

describe('GET /api/transaction/[transactionId]', () => {
  const baseRequestOptions: RequestOptions = {
    method: 'GET' as RequestMethod,
    headers: {
      'Content-Type': 'application/json'
    },
    query: {}
  }

  it('Should return HTTP 400 (Bad Request) if no transaction ID specified', async () => {
    const res = await testEndpoint(baseRequestOptions, transactionDetailsEndpoint)
    expect(res.statusCode).toBe(RESPONSE_MESSAGES.TRANSACTION_ID_NOT_PROVIDED_400.statusCode)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.TRANSACTION_ID_NOT_PROVIDED_400.message)
  })
})

describe('GET /api/balance/[address]', () => {
  const baseRequestOptions: RequestOptions = {
    method: 'GET' as RequestMethod,
    headers: {
      'Content-Type': 'application/json'
    },
    query: {}
  }

  it('Should return HTTP 400 (Bad Request) if no address specified', async () => {
    const res = await testEndpoint(baseRequestOptions, balanceEndpoint)
    expect(res.statusCode).toBe(RESPONSE_MESSAGES.ADDRESS_NOT_PROVIDED_400.statusCode)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.ADDRESS_NOT_PROVIDED_400.message)
  })
})

describe('GET /api/dashboard', () => {
  const baseRequestOptions: RequestOptions = {
    method: 'GET' as RequestMethod,
    headers: {
      'Content-Type': 'application/json'
    },
    query: {}
  }

  const expectedPeriodData = expect.objectContaining({
    revenue: expect.objectContaining({
      labels: expect.any(Array),
      datasets: expect.arrayContaining([
        expect.objectContaining({
          data: expect.any(Array),
          borderColor: expect.any(String)
        })
      ])
    })
  })

  it('Should return HTTP 200', async () => {
    const res = await testEndpoint(baseRequestOptions, dashboardEndpoint)
    expect(res.statusCode).toBe(200)
    const responseData = res._getJSONData()
    expect(responseData).toEqual({
      thirtyDays: expectedPeriodData,
      sevenDays: expectedPeriodData,
      year: expectedPeriodData,
      total: {
        revenue: expect.any(String),
        payments: expect.any(Number),
        buttons: expect.any(Number)
      }
    }
    )
  })
})
