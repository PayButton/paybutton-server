import { RequestOptions, RequestMethod } from 'node-mocks-http'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import paybuttonsEndpoint from 'pages/api/paybuttons/index'
import paybuttonEndpoint from 'pages/api/paybutton/index'
import paybuttonIdEndpoint from 'pages/api/paybutton/[id]'
import walletsEndpoint from 'pages/api/wallets/index'
import walletEndpoint from 'pages/api/wallet/index'
import walletIdEndpoint from 'pages/api/wallet/[id]'
import transactionsEndpoint from 'pages/api/address/transactions/[address]'
import transactionsSyncEndpoint from 'pages/api/address/transactions/sync/[address]'
import transactionDetailsEndpoint from 'pages/api/transaction/[transactionId]'
import balanceEndpoint from 'pages/api/address/balance/[address]'
import dashboardEndpoint from 'pages/api/dashboard/index'
import currentPriceEndpoint from 'pages/api/price/[networkSlug]'
import currentPriceForQuoteEndpoint from 'pages/api/price/[networkSlug]/[quoteSlug]'
import { WalletWithAddressesAndPaybuttons } from 'services/walletService'
import {
  exampleAddresses,
  testEndpoint,
  clearPaybuttonsAndAddresses,
  clearWallets,
  createPaybuttonForUser,
  createWalletForUser,
  countPaybuttons,
  countAddresses,
  countWallets,
  createCurrentPrices
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

describe('PATCH /api/paybutton/', () => {
  let createdPaybuttons: PaybuttonWithAddresses[]
  beforeAll(async () => {
    await clearPaybuttonsAndAddresses()
    createdPaybuttons = []
    const userA = 'test-u-id'
    const userB = 'test-other-u-id'
    for (let i = 0; i < 4; i++) {
      const userId = i === 3 ? userB : userA
      const paybutton = await createPaybuttonForUser(userId)
      createdPaybuttons.push(paybutton)
    }
  })
  const baseRequestOptions: RequestOptions = {
    method: 'PATCH' as RequestMethod,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      addresses: undefined,
      name: undefined
    },
    query: {}
  }

  it('Update a paybutton name', async () => {
    if (baseRequestOptions.query != null) baseRequestOptions.query.id = createdPaybuttons[0].id
    baseRequestOptions.body = {
      name: 'blablabla',
      addresses: undefined
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonIdEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(200)
    expect(responseData.providerUserId).toBe('test-u-id')
    expect(responseData.name).toBe('blablabla')
    expect(responseData.uuid).not.toBeNull()
    expect(responseData.addresses).toEqual(
      expect.arrayContaining([
        {
          address: expect.objectContaining({
            address: createdPaybuttons[0].addresses.map((addr) => addr.address.address)[0]
          })
        },
        {
          address:
          expect.objectContaining({
            address: createdPaybuttons[0].addresses.map((addr) => addr.address.address)[1]
          })
        }
      ])
    )
  })

  it('Update a paybutton addresses', async () => {
    if (baseRequestOptions.query != null) baseRequestOptions.query.id = createdPaybuttons[0].id
    baseRequestOptions.body = {
      addresses: `ecash:${exampleAddresses.ecash}\nbitcoincash:${exampleAddresses.bitcoincash}`
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonIdEndpoint)
    expect(res.statusCode).toBe(200)
    const responseData = res._getJSONData()
    expect(responseData.providerUserId).toBe('test-u-id')
    expect(responseData.name).toBe('blablabla')
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
  })

  it('Should fail with repeated name', async () => {
    if (baseRequestOptions.query != null) baseRequestOptions.query.id = createdPaybuttons[0].id
    baseRequestOptions.body = {
      name: createdPaybuttons[1].name,
      addresses: undefined
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonIdEndpoint)
    expect(res.statusCode).toBe(400)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.PAYBUTTON_NAME_ALREADY_EXISTS_400.message)
  })
  it('Should fail for non non-existent button', async () => {
    if (baseRequestOptions.query != null) baseRequestOptions.query.id = 9128371987912
    baseRequestOptions.body = {
      name: 'some-different-name',
      addresses: undefined
    }
    const res = await testEndpoint(baseRequestOptions, paybuttonIdEndpoint)
    expect(res.statusCode).toBe(404)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.NO_BUTTON_FOUND_404.message)
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

describe('POST /api/wallets/', () => {
  const buttonIds: number[] = []
  beforeAll(async () => {
    await clearPaybuttonsAndAddresses()
    await clearWallets()
    let lastAddress = ''
    for (let i = 0; i < 4; i++) {
      let button
      if (i === 2) {
        button = await createPaybuttonForUser('test-u-id', [lastAddress])
      } else if (i === 3) {
        button = await createPaybuttonForUser('test-other-u-id')
      } else {
        button = await createPaybuttonForUser('test-u-id')
      }
      buttonIds.push(button.id)
      lastAddress = button.addresses.map((conn) => conn.address.address)[0]
    }
  })
  const baseRequestOptions: RequestOptions = {
    method: 'POST' as RequestMethod,
    headers: {
      'Content-Type': 'application/json'
    },
    body: {
      name: 'test-wallet'
    }
  }

  it('Create a wallet with two paybuttons', async () => {
    baseRequestOptions.body = {
      userId: 'test-u-id',
      name: 'test-wallet',
      paybuttonIdList: [buttonIds[0], buttonIds[1]]
    }
    const res = await testEndpoint(baseRequestOptions, walletEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(200)
    expect(responseData.providerUserId).toBe('test-u-id')
    expect(responseData.name).toBe('test-wallet')
    expect(responseData.userProfile).toStrictEqual({
      isXECDefault: null,
      isBCHDefault: null,
      userProfileId: 3
    })
    void expect(countWallets()).resolves.toBe(1)
  })

  it('Fail without name', async () => {
    baseRequestOptions.body = {
      userId: 'test-u-id',
      name: '',
      paybuttonIdList: [buttonIds[2]]
    }
    const res = await testEndpoint(baseRequestOptions, walletEndpoint)
    expect(res.statusCode).toBe(400)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
  })

  it('Fail with repeated name', async () => {
    baseRequestOptions.body = {
      userId: 'test-u-id',
      name: 'test-wallet',
      paybuttonIdList: [buttonIds[2]]
    }
    const res = await testEndpoint(baseRequestOptions, walletEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(400)
    expect(responseData.message).toBe(RESPONSE_MESSAGES.WALLET_NAME_ALREADY_EXISTS_400.message)
  })

  it('Fail with paybutton of other user', async () => {
    baseRequestOptions.body = {
      userId: 'test-u-id',
      name: 'test-other-wallet',
      paybuttonIdList: [buttonIds[3]]
    }
    const res = await testEndpoint(baseRequestOptions, walletEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(400)
    expect(responseData.message).toBe(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
  })

  it('Fail without paybuttonIdList', async () => {
    baseRequestOptions.body = {
      userId: 'test-u-id',
      name: 'test-wallet'
    }
    const res = await testEndpoint(baseRequestOptions, walletEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(400)
    expect(responseData.message).toBe(RESPONSE_MESSAGES.BUTTON_IDS_NOT_PROVIDED_400.message)
  })

  it('Fail with non-existent paybutton', async () => {
    baseRequestOptions.body = {
      userId: 'test-u-id',
      name: 'test-wallet2',
      paybuttonIdList: [1, 99999999999]

    }
    const res = await testEndpoint(baseRequestOptions, walletEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(404)
    expect(responseData.message).toBe(RESPONSE_MESSAGES.NO_BUTTON_FOUND_404.message)
  })

  it('Fail with paybutton that already belongs to other wallet', async () => {
    baseRequestOptions.body = {
      userId: 'test-u-id',
      name: 'test-wallet2',
      paybuttonIdList: [buttonIds[0]]

    }
    const res = await testEndpoint(baseRequestOptions, walletEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(400)
    expect(responseData.message).toBe(RESPONSE_MESSAGES.PAYBUTTON_ALREADY_BELONGS_TO_WALLET_400.message)
  })

  it('Fail with address that already belongs to other wallet', async () => {
    baseRequestOptions.body = {
      userId: 'test-u-id',
      name: 'test-wallet2',
      paybuttonIdList: [buttonIds[2]]

    }
    const res = await testEndpoint(baseRequestOptions, walletEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(400)
    expect(responseData.message).toBe(RESPONSE_MESSAGES.ADDRESS_ALREADY_BELONGS_TO_WALLET_400.message)
  })
})

describe('GET /api/wallets/', () => {
  // Create 4 wallets, 3 for one user and 1 for another.
  const userA = 'test-u-id'
  const userB = 'test-other-u-id'
  beforeAll(async () => {
    await clearPaybuttonsAndAddresses()
    await clearWallets()
    for (let i = 0; i < 4; i++) {
      const userId = i === 3 ? userB : userA
      const pb = await createPaybuttonForUser(userId)
      await createWalletForUser(userId, [pb.id])
    }
  })
  const baseRequestOptions: RequestOptions = {
    method: 'GET' as RequestMethod,
    query: {
      userId: userA
    }
  }

  it('Get 3 wallets for userA', async () => {
    const res = await testEndpoint(baseRequestOptions, walletsEndpoint)
    expect(res.statusCode).toBe(200)
    const responseData = res._getJSONData()
    expect(responseData[0].wallet.providerUserId).toBe(userA)
    expect(responseData.length).toBe(3)
  })

  it('Get 1 wallets for userB', async () => {
    baseRequestOptions.query = {
      userId: userB
    }
    const res = await testEndpoint(baseRequestOptions, walletsEndpoint)
    expect(res.statusCode).toBe(200)
    const responseData = res._getJSONData()
    expect(responseData[0].wallet.providerUserId).toBe(userB)
    expect(responseData.length).toBe(1)
    expect(responseData[0].wallet.addresses).toEqual(
      expect.arrayContaining([
        {
          address: expect.any(String),
          networkId: expect.any(Number),
          id: expect.any(Number)
        },
        {
          address: expect.any(String),
          networkId: expect.any(Number),
          id: expect.any(Number)
        }
      ])
    )
    expect(responseData[0]).toHaveProperty('wallet')
    expect(responseData[0]).toHaveProperty('paymentInfo')
    expect(responseData[0].wallet).toHaveProperty('providerUserId', 'test-other-u-id')
    expect(responseData[0].wallet).toHaveProperty('name')
    expect(responseData[0].wallet).toHaveProperty('paybuttons')
    expect(responseData[0].wallet).toHaveProperty('userProfile')
    expect(responseData[0].paymentInfo).toHaveProperty('XECBalance')
    expect(responseData[0].paymentInfo).toHaveProperty('BCHBalance')
    expect(responseData[0].paymentInfo).toHaveProperty('paymentCount')
  })

  it('Get no wallets for unknown user', async () => {
    baseRequestOptions.query = {
      userId: 'unknown-user'
    }
    const res = await testEndpoint(baseRequestOptions, walletsEndpoint)
    expect(res.statusCode).toBe(200)
    const responseData = res._getJSONData()
    expect(responseData.length).toBe(0)
  })

  it('Fail without userId', async () => {
    baseRequestOptions.query = {
      userId: ''
    }
    const res = await testEndpoint(baseRequestOptions, walletsEndpoint)
    expect(res.statusCode).toBe(400)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  })

  it('Fail with multiple userIds', async () => {
    baseRequestOptions.query = {
      userId: ['test-u-id', 'test-other-u-id']
    }
    const res = await testEndpoint(baseRequestOptions, walletsEndpoint)
    expect(res.statusCode).toBe(400)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.MULTIPLE_USER_IDS_PROVIDED_400.message)
  })
})

describe('GET /api/wallet/[id]', () => {
  // Create 4 wallets
  let createdWalletsIds: number[]
  beforeAll(async () => {
    await clearPaybuttonsAndAddresses()
    await clearWallets()
    createdWalletsIds = []
    for (let i = 0; i < 4; i++) {
      const pb = await createPaybuttonForUser('test-u-id')
      const wallet = await createWalletForUser('test-u-id', [pb.id])
      createdWalletsIds.push(wallet.id)
    }
  })

  const baseRequestOptions: RequestOptions = {
    method: 'GET' as RequestMethod,
    query: {}
  }

  it('Find wallet for created ids', async () => {
    for (const id of createdWalletsIds) {
      if (baseRequestOptions.query != null) baseRequestOptions.query.id = id
      const res = await testEndpoint(baseRequestOptions, walletIdEndpoint)
      const responseData = res._getJSONData()
      expect(res.statusCode).toBe(200)
      expect(responseData.addresses).toEqual(
        expect.arrayContaining([
          {
            id: expect.any(Number),
            networkId: expect.any(Number),
            address: expect.any(String)
          },
          {
            id: expect.any(Number),
            networkId: expect.any(Number),
            address: expect.any(String)
          }
        ])
      )
      expect(responseData.paybuttons).toEqual(
        expect.arrayContaining([
          {
            id: expect.any(Number),
            providerUserId: expect.any(String),
            walletId: expect.any(Number),
            name: expect.any(String),
            uuid: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            buttonData: expect.any(String)
          }
        ])
      )
      expect(responseData).toHaveProperty('providerUserId')
      expect(responseData).toHaveProperty('name')
    }
  })

  it('Not find wallet for next id', async () => {
    const nextId = createdWalletsIds[createdWalletsIds.length - 1] + 1
    if (baseRequestOptions.query != null) baseRequestOptions.query.id = nextId
    const res = await testEndpoint(baseRequestOptions, walletIdEndpoint)
    expect(res.statusCode).toBe(404)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.NO_WALLET_FOUND_404.message)
  })
})

describe('PATCH /api/wallet/[id]', () => {
  // Create 4 wallets
  let createdWallets: WalletWithAddressesAndPaybuttons[]
  let baseRequestOptions: RequestOptions = {
    method: 'PATCH' as RequestMethod,
    query: {
      id: null
    },
    body: {
      name: '',
      isXECDefault: null,
      isBCHDefault: null,
      paybuttonIdList: []
    }
  }

  beforeAll(async () => {
    await clearPaybuttonsAndAddresses()
    await clearWallets()
    createdWallets = []
    for (let i = 0; i < 4; i++) {
      const pb = await createPaybuttonForUser('test-u-id')
      const wallet = await createWalletForUser('test-u-id', [pb.id])
      createdWallets.push(wallet)
    }
  })
  beforeEach(async () => {
    baseRequestOptions = {
      method: 'PATCH' as RequestMethod,
      query: {
        id: null
      },
      body: {
        name: '',
        isXECDefault: null,
        isBCHDefault: null,
        paybuttonIdList: []
      }
    }
  })

  it('Update wallet name', async () => {
    const wallet = createdWallets[0]
    if (baseRequestOptions.query != null) baseRequestOptions.query.id = wallet.id
    if (baseRequestOptions.body != null) {
      baseRequestOptions.body.name = wallet.name + '-new'
      baseRequestOptions.body.paybuttonIdList = wallet.paybuttons.map((pb) => pb.id)
    }
    const res = await testEndpoint(baseRequestOptions, walletIdEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(200)
    // avoid comparing `Date` with `string`
    responseData.paybuttons[0].updatedAt = new Date(wallet.paybuttons[0].updatedAt)
    responseData.paybuttons[0].createdAt = new Date(responseData.paybuttons[0].createdAt)
    expect(responseData).toMatchObject({
      ...wallet,
      name: wallet.name + '-new',
      createdAt: expect.anything(),
      updatedAt: expect.anything()
    })
  })

  it('Fail for repeated wallet name', async () => {
    const wallet = createdWallets[0]
    if (baseRequestOptions.query != null) baseRequestOptions.query.id = wallet.id
    if (baseRequestOptions.body != null) {
      baseRequestOptions.body.name = createdWallets[1].name
      baseRequestOptions.body.paybuttonIdList = wallet.paybuttons.map((pb) => pb.id)
    }
    const res = await testEndpoint(baseRequestOptions, walletIdEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(400)
    expect(responseData.message).toBe(RESPONSE_MESSAGES.WALLET_NAME_ALREADY_EXISTS_400.message)
  })

  it('Update wallet as XEC default', async () => {
    const wallet = createdWallets[1]
    if (baseRequestOptions.query != null) baseRequestOptions.query.id = wallet.id
    if (baseRequestOptions.body != null) {
      baseRequestOptions.body.name = wallet.name
      baseRequestOptions.body.paybuttonIdList = wallet.paybuttons.map((pb) => pb.id)
      baseRequestOptions.body.isXECDefault = true
    }
    const res = await testEndpoint(baseRequestOptions, walletIdEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(200)
    // avoid comparing `Date` with `string`
    responseData.paybuttons[0].updatedAt = new Date(wallet.paybuttons[0].updatedAt)
    responseData.paybuttons[0].createdAt = new Date(responseData.paybuttons[0].createdAt)
    expect(responseData).toMatchObject({
      ...wallet,
      userProfile: {
        ...wallet.userProfile,
        isXECDefault: true
      },
      createdAt: expect.anything(),
      updatedAt: expect.anything()
    })
  })

  it('Update wallet as BCH default', async () => {
    const wallet = createdWallets[2]
    if (baseRequestOptions.query != null) baseRequestOptions.query.id = wallet.id
    if (baseRequestOptions.body != null) {
      baseRequestOptions.body.name = wallet.name
      baseRequestOptions.body.paybuttonIdList = wallet.paybuttons.map((pb) => pb.id)
      baseRequestOptions.body.isBCHDefault = true
    }
    const res = await testEndpoint(baseRequestOptions, walletIdEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(200)
    // avoid comparing `Date` with `string`
    responseData.paybuttons[0].updatedAt = new Date(wallet.paybuttons[0].updatedAt)
    responseData.paybuttons[0].createdAt = new Date(responseData.paybuttons[0].createdAt)
    expect(responseData).toMatchObject({
      ...wallet,
      userProfile: {
        ...wallet.userProfile,
        isBCHDefault: true
      },
      createdAt: expect.anything(),
      updatedAt: expect.anything()
    })
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

describe('DELETE /api/paybutton/[id]', () => {
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
    method: 'DELETE' as RequestMethod,
    query: {}
  }

  it('Delete paybutton', async () => {
    if (baseRequestOptions.query != null) baseRequestOptions.query.id = createdPaybuttonsIds[0]
    const res = await testEndpoint(baseRequestOptions, paybuttonIdEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(200)
    expect(responseData.addresses).toEqual(
      expect.arrayContaining([
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
  })

  it('Fail to delete non-existent paybutton', async () => {
    if (baseRequestOptions.query != null) baseRequestOptions.query.id = 999999
    const res = await testEndpoint(baseRequestOptions, paybuttonIdEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(404)
    expect(responseData.message).toBe(RESPONSE_MESSAGES.NO_BUTTON_FOUND_404.message)
  })

  it("Fail to delete another user's paybutton", async () => {
    if (baseRequestOptions.query != null) baseRequestOptions.query.id = createdPaybuttonsIds[3]
    const res = await testEndpoint(baseRequestOptions, paybuttonIdEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(400)
    expect(responseData.message).toBe(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
  })
})

describe('GET /api/address/transactions/[address]', () => {
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

  it('Should return HTTP 400 in case address is invalid', async () => {
    const baseRequestOptions: RequestOptions = {
      method: 'GET' as RequestMethod,
      headers: {
        'Content-Type': 'application/json'
      },
      query: {
        address: 'lkdasjfçlajdsfl'
      }
    }
    const res = await testEndpoint(baseRequestOptions, transactionsEndpoint)
    expect(res.statusCode).toBe(400)
  })

  it('Should return HTTP 404 in case address is valid but not yet on the system', async () => {
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
    expect(res.statusCode).toBe(404)
  })
})

describe('GET /api/address/transactions/sync/[address]', () => {
  const baseRequestOptions: RequestOptions = {
    method: 'GET' as RequestMethod,
    headers: {
      'Content-Type': 'application/json'
    },
    query: {}
  }

  it('Should return HTTP 400 (Bad Request) if no address specified', async () => {
    const res = await testEndpoint(baseRequestOptions, transactionsSyncEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(400)
    expect(responseData.message).toBe(RESPONSE_MESSAGES.ADDRESS_NOT_PROVIDED_400.message)
  })

  it('Should return HTTP 400 in case address is invalid', async () => {
    const baseRequestOptions: RequestOptions = {
      method: 'GET' as RequestMethod,
      headers: {
        'Content-Type': 'application/json'
      },
      query: {
        address: 'ulkjas8hfn29-hnro123ihj42890h'
      }
    }
    const res = await testEndpoint(baseRequestOptions, transactionsSyncEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(400)
    expect(responseData.message).toBe(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
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
    const res = await testEndpoint(baseRequestOptions, transactionsSyncEndpoint)
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

describe('GET /api/address/balance/[address]', () => {
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
      all: expectedPeriodData,
      paymentList: expect.any(Array),
      total: {
        revenue: expect.any(String),
        payments: expect.any(Number),
        buttons: expect.any(Number)
      }
    }
    )
  })
})

describe('GET /api/prices/current/[networkSlug]', () => {
  const baseRequestOptions: RequestOptions = {
    method: 'GET' as RequestMethod,
    headers: {
      'Content-Type': 'application/json'
    },
    query: {}
  }

  beforeAll(async () => {
    void await createCurrentPrices()
  })

  it('Should return HTTP 400 (Bad Request) if no networkSlug specified', async () => {
    const res = await testEndpoint(baseRequestOptions, currentPriceEndpoint)
    expect(res.statusCode).toBe(RESPONSE_MESSAGES.NETWORK_SLUG_NOT_PROVIDED_400.statusCode)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.NETWORK_SLUG_NOT_PROVIDED_400.message)
  })

  it('Should return HTTP 400 if invalid networkSlug specified', async () => {
    baseRequestOptions.query = { networkSlug: 'bla' }
    const res = await testEndpoint(baseRequestOptions, currentPriceEndpoint)
    expect(res.statusCode).toBe(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.statusCode)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.message)
  })

  it('Should return HTTP 200', async () => {
    baseRequestOptions.query = { networkSlug: 'ecash' }
    const res = await testEndpoint(baseRequestOptions, currentPriceEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(200)
    expect(responseData).toEqual('122')
  })
})

describe('GET /api/prices/current/[networkSlug]/[quoteSlug]', () => {
  const baseRequestOptions: RequestOptions = {
    method: 'GET' as RequestMethod,
    headers: {
      'Content-Type': 'application/json'
    },
    query: {}
  }

  beforeAll(async () => {
    void await createCurrentPrices()
  })

  it('Should return HTTP 400 if no networkSlug specified', async () => {
    baseRequestOptions.query = { quoteSlug: 'cad' }
    const res = await testEndpoint(baseRequestOptions, currentPriceForQuoteEndpoint)
    expect(res.statusCode).toBe(RESPONSE_MESSAGES.NETWORK_SLUG_NOT_PROVIDED_400.statusCode)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.NETWORK_SLUG_NOT_PROVIDED_400.message)
  })

  it('Should return HTTP 400 if no quoteSlug specified', async () => {
    baseRequestOptions.query = { networkSlug: 'ecash' }
    const res = await testEndpoint(baseRequestOptions, currentPriceForQuoteEndpoint)
    expect(res.statusCode).toBe(RESPONSE_MESSAGES.QUOTE_SLUG_NOT_PROVIDED_400.statusCode)
    const responseData = res._getJSONData()
    expect(responseData.message).toBe(RESPONSE_MESSAGES.QUOTE_SLUG_NOT_PROVIDED_400.message)
  })

  it('Should return HTTP 400 if invalid networkSlug specified', async () => {
    baseRequestOptions.query = { networkSlug: 'bla', quoteSlug: 'cad' }
    const res = await testEndpoint(baseRequestOptions, currentPriceForQuoteEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.statusCode)
    expect(responseData.message).toBe(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.message)
  })

  it('Should return HTTP 400 if invalid quoteSlug specified', async () => {
    baseRequestOptions.query = { networkSlug: 'ecash', quoteSlug: 'bla' }
    const res = await testEndpoint(baseRequestOptions, currentPriceForQuoteEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(RESPONSE_MESSAGES.INVALID_QUOTE_SLUG_400.statusCode)
    expect(responseData.message).toBe(RESPONSE_MESSAGES.INVALID_QUOTE_SLUG_400.message)
  })

  it('Should return HTTP 200', async () => {
    baseRequestOptions.query = { networkSlug: 'ecash', quoteSlug: 'cad' }
    const res = await testEndpoint(baseRequestOptions, currentPriceForQuoteEndpoint)
    const responseData = res._getJSONData()
    expect(res.statusCode).toBe(200)
    expect(responseData).toEqual('133')
  })
})
