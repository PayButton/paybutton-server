import { RequestOptions, RequestMethod } from 'node-mocks-http'
import paybuttonEndpoint from 'pages/api/paybutton/index'
import paybuttonIdEndpoint from 'pages/api/paybutton/[id]'
import {
  testEndpoint,
  clearPaybuttons,
  createPaybuttonForUser,
  countPaybuttons,
  countPaybuttonAddresses
} from 'tests/utils'
import { RESPONSE_MESSAGES } from 'constants/index'

afterAll(async () => {
  await clearPaybuttons()
})

describe('POST /api/paybutton/', () => {
  beforeAll(async () => {
    await clearPaybuttons()
  })
  const baseRequestOptions = {
    method: 'POST' as RequestMethod,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      userId: 'test-u-id',
      addresses: 'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\nbitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
    }
  }

  it('Should create a paybutton with two addresses', async () => {
    const res = await testEndpoint(baseRequestOptions, paybuttonEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(200)
    expect(responseData.providerUserId).toBe('test-u-id')
    expect(responseData.addresses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          address: 'qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc'
        }),
        expect.objectContaining({
          address: 'qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
        })
      ])
    )
    void expect(countPaybuttons()).resolves.toBe(1)
    void expect(countPaybuttonAddresses()).resolves.toBe(2)
  })

  it('Should fail without userId', async () => {
    baseRequestOptions.body = {
      userId: '',
      addresses: 'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\nbitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonEndpoint)
    expect(res.statusCode).toBe(400)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  })

  it('Should fail without addresses', async () => {
    baseRequestOptions.body = {
      userId: 'test-u-id',
      addresses: ''
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonEndpoint)
    expect(res.statusCode).toBe(400)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message)
  })

  it('Should fail with invalid addresses', async () => {
    baseRequestOptions.body = {
      userId: 'test-u-id',
      addresses: 'ecash:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\nbitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonEndpoint)
    expect(res.statusCode).toBe(400)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
  })
})

describe('GET /api/paybutton/', () => {
  // Create 4 paybuttons, 3 for one user and 1 for another.
  const userA = 'test-u-id'
  const userB = 'test-other-u-id'
  beforeAll(async () => {
    await clearPaybuttons()
    for (let i = 0; i < 4; i++) {
      const userId = i === 3 ? userB : userA
      await createPaybuttonForUser(userId)
    }
  })

  const baseRequestOptions = {
    method: 'GET' as RequestMethod,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      userId: userA
    }
  }

  it('Should get 3 paybuttons for userA', async () => {
    const res = await testEndpoint(baseRequestOptions, paybuttonEndpoint)
    expect(res.statusCode).toBe(200)
    const responseData = res._getJSONData()
    expect(responseData[0].providerUserId).toBe(userA)
    expect(responseData.length).toBe(3)
  })

  it('Should get 1 paybuttons for userB', async () => {
    baseRequestOptions.body = {
      userId: userB
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonEndpoint)
    expect(res.statusCode).toBe(200)
    const responseData = res._getJSONData()
    expect(responseData[0].providerUserId).toBe(userB)
    expect(responseData.length).toBe(1)
    expect(responseData[0].addresses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          address: expect.any(String)
        }),
        expect.objectContaining({
          address: expect.any(String)
        })
      ])
    )
    expect(responseData[0]).toHaveProperty('providerUserId')
  })

  it('Should get no paybuttons for unknown user', async () => {
    baseRequestOptions.body = {
      userId: 'unknown-user'
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonEndpoint)
    expect(res.statusCode).toBe(200)
    const responseData = res._getJSONData()
    expect(responseData.length).toBe(0)
  })
})

describe('GET /api/paybutton/[id]', () => {
  // Create 4 paybuttons, 3 for one user and 1 for another.
  const userA = 'test-u-id'
  const userB = 'test-other-u-id'
  let createdPaybuttonsIds: number[]
  beforeAll(async () => {
    await clearPaybuttons()
    createdPaybuttonsIds = []
    for (let i = 0; i < 4; i++) {
      const userId = i === 3 ? userB : userA
      const paybutton = await createPaybuttonForUser(userId)
      createdPaybuttonsIds.push(paybutton.id)
    }
  })

  const baseRequestOptions: RequestOptions = {
    method: 'GET' as RequestMethod,
    headers: {
      'Content-Type': 'application/json'
    },
    query: {}
  }

  it('Should find paybutton for created ids', async () => {
    for (const id of createdPaybuttonsIds) {
      if (baseRequestOptions.query != null) baseRequestOptions.query.id = id
      const res = await testEndpoint(baseRequestOptions, paybuttonIdEndpoint)
      const responseData = res._getJSONData()
      expect(res.statusCode).toBe(200)
      expect(responseData.addresses).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            address: expect.any(String)
          }),
          expect.objectContaining({
            address: expect.any(String)
          })
        ])
      )
      expect(responseData).toHaveProperty('providerUserId')
    }
  })

  it('Should not find paybutton for next id', async () => {
    const nextId = createdPaybuttonsIds[createdPaybuttonsIds.length - 1] + 1
    if (baseRequestOptions.query != null) baseRequestOptions.query.id = nextId
    const res = await testEndpoint(baseRequestOptions, paybuttonIdEndpoint)
    expect(res.statusCode).toBe(404)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.NOT_FOUND_404.message)
  })
})
