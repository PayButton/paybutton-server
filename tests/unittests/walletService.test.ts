import prisma from 'prisma/clientInstance'
import * as walletService from 'services/walletService'
import { Paybutton, Address } from '@prisma/client'
import { prismaMock } from 'prisma/mockedClient'
import { RESPONSE_MESSAGES } from 'constants/index'
import { mockedWallet, mockedWalletList, mockedPaybuttonList, mockedNetwork } from '../mockedObjects'

describe('Fetch services', () => {
  it('Should fetch wallet by id', async () => {
    prismaMock.wallet.findUnique.mockResolvedValue(mockedWallet)
    prisma.wallet.findUnique = prismaMock.wallet.findUnique

    const result = await walletService.fetchWalletById(4)
    expect(result).toEqual(mockedWallet)
  })

  it('Should fetch all wallets by userId', async () => {
    prismaMock.wallet.findMany.mockResolvedValue(mockedWalletList)
    prisma.wallet.findMany = prismaMock.wallet.findMany

    const result = await walletService.fetchWalletArrayByUserId('mocked-uid')
    expect(result).toEqual(mockedWalletList)
  })
})

describe('Create services', () => {
  interface Data {
    address: Address
    paybuttons: Paybutton[]
    createWalletInput: walletService.CreateWalletInput
  }
  const data: Data = {
    address: mockedPaybuttonList[0].addresses[0].address,
    paybuttons: mockedPaybuttonList.slice(0, 1),
    createWalletInput: {
      userId: 'mocked-uid',
      name: 'mockedWallet-name',
      paybuttonIdList: [1, 2]
    }
  }

  beforeEach(() => {
    prismaMock.wallet.create.mockResolvedValue(mockedWallet)
    prisma.wallet.create = prismaMock.wallet.create
    prismaMock.paybutton.update.mockResolvedValue(mockedPaybuttonList[0])
    prisma.paybutton.update = prismaMock.paybutton.update
    prismaMock.address.update.mockResolvedValue(data.address)
    prisma.address.update = prismaMock.address.update

    prismaMock.network.findUnique.mockResolvedValue(mockedNetwork)
    prisma.network.findUnique = prismaMock.network.findUnique
    prismaMock.paybutton.findMany.mockResolvedValue(data.paybuttons)
    prisma.paybutton.findMany = prismaMock.paybutton.findMany
  })

  it('Should return wallet nested', async () => {
    const result = await walletService.createWallet(data.createWalletInput)
    expect(result).toEqual(mockedWallet)
  })

  it('Should failed for already binded paybutton', async () => {
    data.paybuttons[0].walletId = 1
    expect.assertions(1)
    try {
      await walletService.createWallet(data.createWalletInput)
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.PAYBUTTON_ALREADY_BELONGS_TO_WALLET_400.message)
    }
  })

  it('Should failed for already binded address', async () => {
    data.paybuttons[0].walletId = null
    data.address.walletId = 1
    expect.assertions(1)
    try {
      await walletService.createWallet(data.createWalletInput)
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.ADDRESS_ALREADY_BELONGS_TO_WALLET_400.message)
    }
  })
})
