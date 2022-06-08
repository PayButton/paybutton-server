import prisma from 'prisma/clientInstance'
import paybuttonEndpoint from 'pages/api/paybutton/index'
import { testEndpoint, clearPaybuttons, clearPaybuttonAddresses } from 'tests/utils'

afterAll(() => {
  void clearPaybuttons()
  void clearPaybuttonAddresses()
})

describe('POST /api/paybutton/', () => {
  const baseRequestJSON = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      userId: 'test-u-id',
      addresses: 'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\nbitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
    }
  }

  it('Should succeed', async () => {
    const res = await testEndpoint(baseRequestJSON, paybuttonEndpoint)
    const resposeData = res._getJSONData()
    expect(res.statusCode).toBe(200)
    expect(resposeData.providerUserId).toBe('test-u-id')
    expect(resposeData.addresses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          address: 'qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc'
        }),
        expect.objectContaining({
          address: 'qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
        })
      ])
    )
  })

  it('Should fail without userId', async () => {
    baseRequestJSON.body = {
      userId: '',
      addresses: 'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\nbitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
    }
    const res = await testEndpoint(baseRequestJSON, paybuttonEndpoint)
    expect(res.statusCode).toBe(400)
  })

  it('Should fail without addresses', async () => {
    baseRequestJSON.body = {
      userId: 'test-u-id',
      addresses: ''
    }
    const res = await testEndpoint(baseRequestJSON, paybuttonEndpoint)
    expect(res.statusCode).toBe(400)
  })

  it('Should fail with invalid addresses', async () => {
    baseRequestJSON.body = {
      userId: 'test-u-id',
      addresses: 'ecash:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\nbitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
    }
    const res = await testEndpoint(baseRequestJSON, paybuttonEndpoint)
    expect(res.statusCode).toBe(400)
  })

  describe('Test database update', () => {
    it('Should have created only one paybutton with two addresses', async () => {
      const paybuttonList = await prisma.paybutton.findMany({})
      const paybuttonAddressList = await prisma.paybuttonAddress.findMany({})
      expect(paybuttonList.length).toBe(1)
      expect(paybuttonAddressList.length).toBe(2)
    })
  })
})
