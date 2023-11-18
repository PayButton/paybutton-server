import prisma from 'prisma/clientInstance'
import { Prisma, Paybutton, Address } from '@prisma/client'
import * as walletService from 'services/walletService'
import * as addressService from 'services/addressService'
import { prismaMock } from 'prisma/mockedClient'
import { RESPONSE_MESSAGES, XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'
import {
  mockedWallet,
  mockedWalletList,
  mockedPaybuttonList,
  mockedPaybutton,
  mockedNetwork,
  mockedAddressList,
  mockedBCHAddressWithPaybutton,
  mockedAddressesOnUserProfile
} from '../mockedObjects'

const prismaMockPaybuttonAndAddressUpdate = (): void => {
  prismaMock.address.update.mockResolvedValue(mockedAddressList[0])
  prisma.address.update = prismaMock.address.update

  prismaMock.address.findUnique.mockResolvedValue(mockedAddressList[0])
  prisma.address.findUnique = prismaMock.address.findUnique

  prismaMock.addressesOnUserProfiles.update.mockResolvedValue(mockedAddressesOnUserProfile)
  prisma.addressesOnUserProfiles.update = prismaMock.addressesOnUserProfiles.update

  prismaMock.addressesOnUserProfiles.upsert.mockResolvedValue(mockedAddressesOnUserProfile)
  prisma.addressesOnUserProfiles.upsert = prismaMock.addressesOnUserProfiles.upsert
}

describe('Fetch services', () => {
  it('Should fetch wallet by id', async () => {
    prismaMock.wallet.findUnique.mockResolvedValue(mockedWallet)
    prisma.wallet.findUnique = prismaMock.wallet.findUnique

    const result = await walletService.fetchWalletById(mockedWallet.id)
    expect(result).toEqual(mockedWallet)
  })

  it('Should fetch all wallets by userId', async () => {
    prismaMock.wallet.findMany.mockResolvedValue(mockedWalletList)
    prisma.wallet.findMany = prismaMock.wallet.findMany

    const result = await walletService.fetchWalletArrayByUserId('mocked-uid')
    expect(result).toEqual(mockedWalletList)
  })

  it('Wallet balance', async () => {
    jest.spyOn(addressService, 'generateAddressPaymentInfo').mockImplementation(async (_: string) => {
      return {
        balance: new Prisma.Decimal('17.5'),
        paymentCount: 3
      }
    })
    const params: walletService.WalletWithAddressesWithPaybuttons = {
      ...mockedWallet,
      userProfile: null,
      userAddresses: [{
        ...mockedWallet.userAddresses[0],
        address: mockedBCHAddressWithPaybutton
      }]
    }
    const result = await walletService.getWalletBalance(params)
    expect(result).toHaveProperty('XECBalance', new Prisma.Decimal('0'))
    expect(result).toHaveProperty('BCHBalance', new Prisma.Decimal('17.5'))
    expect(result).toHaveProperty('paymentCount', 3)
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
      addressIdList: ['0a03a880-86fe-4d82-9aa2-8df270cf032d']
    }
  }

  beforeEach(() => {
    prismaMock.wallet.create.mockResolvedValue(mockedWallet)
    prisma.wallet.create = prismaMock.wallet.create
    prismaMock.wallet.findUnique.mockResolvedValue(mockedWallet)
    prisma.wallet.findUnique = prismaMock.wallet.findUnique
    prismaMock.$transaction.mockImplementation(
      (fn: (prisma: any) => any) => {
        return fn(prisma)
      }
    )
    prisma.$transaction = prismaMock.$transaction

    prismaMockPaybuttonAndAddressUpdate()

    prismaMock.network.findUnique.mockResolvedValue(mockedNetwork)
    prisma.network.findUnique = prismaMock.network.findUnique
    prismaMock.paybutton.findMany.mockResolvedValue(data.paybuttons)
    prisma.paybutton.findMany = prismaMock.paybutton.findMany
  })

  it('Should return wallet nested', async () => {
    const result = await walletService.createWallet(data.createWalletInput)
    expect(result).toEqual(mockedWallet)
  })
})

describe('Update services', () => {
  interface Data {
    updateWalletInput: walletService.UpdateWalletInput
  }
  let data: Data

  beforeEach(() => {
    data = {
      updateWalletInput: {
        name: 'mockedWallet',
        isXECDefault: undefined,
        isBCHDefault: undefined,
        addressIdList: ['0a03a880-86fe-4d82-9aa2-8df270cf032d'],
        userId: 'mocked-uid'
      }
    }
    prismaMock.wallet.update.mockResolvedValue(mockedWallet)
    prisma.wallet.update = prismaMock.wallet.update
    prismaMock.wallet.findUnique.mockResolvedValue(mockedWallet)
    prisma.wallet.findUnique = prismaMock.wallet.findUnique
    prismaMock.$transaction.mockImplementation(
      (fn: (prisma: any) => any) => {
        return fn(prisma)
      }
    )
    prisma.$transaction = prismaMock.$transaction
    prismaMock.paybutton.findMany.mockResolvedValue(mockedPaybuttonList)
    prisma.paybutton.findMany = prismaMock.paybutton.findMany

    prismaMockPaybuttonAndAddressUpdate()

    prismaMock.network.findUnique.mockResolvedValue(mockedNetwork)
    prisma.network.findUnique = prismaMock.network.findUnique
    prismaMock.paybutton.findMany.mockResolvedValue([mockedPaybuttonList[0]])
    prisma.paybutton.findMany = prismaMock.paybutton.findMany
  })

  it('Update wallet', async () => {
    const result = await walletService.updateWallet(mockedWallet.id, data.updateWalletInput)
    expect(result).toEqual({
      ...mockedWallet
    })
  })

  it('Succeed for paybutton that is already on another wallet', async () => {
    const otherWalletButton = {
      ...mockedPaybutton,
      walletId: 2
    }
    prismaMock.paybutton.findMany.mockResolvedValue([otherWalletButton])
    prisma.paybutton.findMany = prismaMock.paybutton.findMany
    const result = await walletService.updateWallet(mockedWallet.id, data.updateWalletInput)
    expect(result).toEqual(mockedWallet)
  })
  it('Fail if wallet does not exist', async () => {
    prismaMock.wallet.findUnique.mockResolvedValue(null)
    prisma.wallet.findUnique = prismaMock.wallet.findUnique
    expect.assertions(1)
    try {
      await walletService.updateWallet(mockedWallet.id, data.updateWalletInput)
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.NO_WALLET_FOUND_404.message)
    }
  })
  it('Fail if wallet has no userProfile associated', async () => {
    const otherWallet = {
      ...mockedWallet
    }
    otherWallet.userProfile = null
    prismaMock.wallet.findUnique.mockResolvedValue(otherWallet)
    prisma.wallet.findUnique = prismaMock.wallet.findUnique
    expect.assertions(1)
    try {
      await walletService.updateWallet(mockedWallet.id, data.updateWalletInput)
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.NO_USER_PROFILE_FOUND_ON_WALLET_404.message)
    }
  })
  it('Fail for empty name', async () => {
    data.updateWalletInput.name = ''
    expect.assertions(1)
    try {
      await walletService.updateWallet(mockedWallet.id, data.updateWalletInput)
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
    }
  })
})

describe('Auxiliary functions', () => {
  it('gets network default', () => {
    expect(
      walletService.getDefaultForNetworkIds(true, true)
    ).toStrictEqual([1, 2])
    expect(
      walletService.getDefaultForNetworkIds(true, false)
    ).toStrictEqual([1])
    expect(
      walletService.getDefaultForNetworkIds(false, true)
    ).toStrictEqual([2])
    expect(
      walletService.getDefaultForNetworkIds(false, false)
    ).toStrictEqual([])
  })
  it('Mocked wallet has address for both networks', () => {
    expect(
      walletService.walletHasAddressForNetwork(mockedWallet, XEC_NETWORK_ID)
    ).toBe(true)
    expect(
      walletService.walletHasAddressForNetwork(mockedWallet, XEC_NETWORK_ID)
    ).toBe(true)
  })
  it('Mocked wallet has address only for XEC', () => {
    const otherWallet = { ...mockedWallet }
    otherWallet.userAddresses = otherWallet.userAddresses.filter((addr) => addr.address.networkId === XEC_NETWORK_ID)
    expect(
      walletService.walletHasAddressForNetwork(otherWallet, XEC_NETWORK_ID)
    ).toBe(true)
    expect(
      walletService.walletHasAddressForNetwork(otherWallet, BCH_NETWORK_ID)
    ).toBe(false)
  })
  it('Mocked wallet has address only for BCH', () => {
    const otherWallet = { ...mockedWallet }
    otherWallet.userAddresses = otherWallet.userAddresses.filter((addr) => addr.address.networkId === BCH_NETWORK_ID)
    expect(
      walletService.walletHasAddressForNetwork(otherWallet, BCH_NETWORK_ID)
    ).toBe(true)
    expect(
      walletService.walletHasAddressForNetwork(otherWallet, XEC_NETWORK_ID)
    ).toBe(false)
  })
  it('Mocked wallet has no addresses', () => {
    const otherWallet = { ...mockedWallet }
    otherWallet.userAddresses = []
    expect(
      walletService.walletHasAddressForNetwork(otherWallet, BCH_NETWORK_ID)
    ).toBe(false)
    expect(
      walletService.walletHasAddressForNetwork(otherWallet, XEC_NETWORK_ID)
    ).toBe(false)
  })
})
