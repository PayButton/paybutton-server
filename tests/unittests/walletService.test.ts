import prisma from 'prisma/clientInstance'
import { Prisma, Paybutton, Address } from '@prisma/client'
import * as walletService from 'services/walletService'
import * as addressService from 'services/addressService'
import { prismaMock } from 'prisma/mockedClient'
import { RESPONSE_MESSAGES, XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'
import { mockedWallet, mockedWalletList, mockedPaybuttonList, mockedPaybutton, mockedNetwork, mockedBCHAddress, mockedAddressList } from '../mockedObjects'

const prismaMockPaybuttonAndAddressUpdate = (): void => {
  prismaMock.paybutton.update.mockImplementation((_) => {
    const { addresses, ...paybuttonWithNoAddresses } = mockedPaybuttonList.filter(pb => pb.id === _.where.id)[0] as any
    return paybuttonWithNoAddresses
  })
  prisma.paybutton.update = prismaMock.paybutton.update
  prismaMock.address.update.mockImplementation((_) => {
    const { createdAt, updatedAt, lastSynced, walletId, ...addressesWithNoExtraProperties } = mockedAddressList.filter(addr => addr.id === _.where.id)[0] as any
    return addressesWithNoExtraProperties
  })

  prisma.address.update = prismaMock.address.update
}

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

  it('Wallet balance', async () => {
    jest.spyOn(addressService, 'getAddressPaymentInfo').mockImplementation(async (_: string) => {
      return {
        balance: new Prisma.Decimal('17.5'),
        paymentCount: 3
      }
    })
    const params: walletService.WalletWithAddressesAndPaybuttons = {
      ...mockedWallet,
      userProfile: null,
      addresses: [mockedBCHAddress],
      paybuttons: []
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
      paybuttonIdList: [1]
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

  it('Should failed for already binded paybutton', async () => {
    data.paybuttons[0].walletId = 1729
    expect.assertions(1)
    try {
      await walletService.createWallet(data.createWalletInput)
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.PAYBUTTON_ALREADY_BELONGS_TO_WALLET_400.message)
    } finally {
      data.paybuttons[0].walletId = null
    }
  })

  it('Should failed for already binded address', async () => {
    data.address.walletId = 1729
    expect.assertions(1)
    try {
      await walletService.createWallet(data.createWalletInput)
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.ADDRESS_ALREADY_BELONGS_TO_WALLET_400.message)
    } finally {
      data.address.walletId = null
    }
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
        paybuttonIdList: [1],
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
    const { addresses, ...paybuttonWithNoAddresses } = mockedPaybuttonList[0]
    expect(result).toEqual({
      ...mockedWallet,
      paybuttons: [paybuttonWithNoAddresses]
    })
  })

  it('Fail for paybutton that is already on another wallet', async () => {
    const otherWalletButton = {
      ...mockedPaybutton,
      walletId: 2
    }
    prismaMock.paybutton.findMany.mockResolvedValue([otherWalletButton])
    prisma.paybutton.findMany = prismaMock.paybutton.findMany
    expect.assertions(1)
    try {
      await walletService.updateWallet(mockedWallet.id, data.updateWalletInput)
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.PAYBUTTON_ALREADY_BELONGS_TO_WALLET_400.message)
    }
  })
  it('Fail for address that is already on another wallet', async () => {
    mockedPaybutton.addresses[0].address.walletId = 999
    prismaMock.paybutton.findMany.mockResolvedValue([mockedPaybutton])
    prisma.paybutton.findMany = prismaMock.paybutton.findMany
    expect.assertions(1)
    try {
      await walletService.updateWallet(mockedWallet.id, data.updateWalletInput)
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.ADDRESS_ALREADY_BELONGS_TO_WALLET_400.message)
    } finally {
      mockedPaybutton.addresses[0].address.walletId = 1
    }
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

describe('Set wallet paybuttons', () => {
  beforeEach(() => {
    prismaMockPaybuttonAndAddressUpdate()
  })
  it('Update with same paybuttons', async () => {
    const result = await walletService.setPaybuttonListForWallet(
      prismaMock,
      [mockedPaybutton],
      mockedWallet
    )
    expect(result).toEqual(mockedWallet)
  })
  it('Update paybutton that already belongs to other wallet', async () => {
    const result = await walletService.setPaybuttonListForWallet(
      prismaMock,
      [{
        ...mockedPaybutton,
        walletId: 999
      }],
      mockedWallet
    )
    expect(result).toEqual(mockedWallet)
  })
  it('Update for paybutton with address that already belongs to other wallet', async () => {
    const newPaybuttonAddressesList = [
      {
        address: {
          ...mockedPaybutton.addresses[0].address,
          walletId: 999
        }
      },
      {
        address: mockedPaybutton.addresses[1].address
      }
    ]
    const result = await walletService.setPaybuttonListForWallet(
      prismaMock,
      [{
        ...mockedPaybutton,
        addresses: newPaybuttonAddressesList
      }],
      mockedWallet
    )
    expect(result).toEqual(mockedWallet)
  })
  it('Fail for paybutton of different user than wallet', async () => {
    expect.assertions(1)
    try {
      await walletService.setPaybuttonListForWallet(
        prismaMock,
        [{
          ...mockedPaybutton,
          providerUserId: 'alskdfjaçsldkjfalçskdfj'
        }],
        mockedWallet
      )
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
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
    otherWallet.addresses = otherWallet.addresses.filter((addr) => addr.networkId === XEC_NETWORK_ID)
    expect(
      walletService.walletHasAddressForNetwork(otherWallet, XEC_NETWORK_ID)
    ).toBe(true)
    expect(
      walletService.walletHasAddressForNetwork(otherWallet, BCH_NETWORK_ID)
    ).toBe(false)
  })
  it('Mocked wallet has address only for BCH', () => {
    const otherWallet = { ...mockedWallet }
    otherWallet.addresses = otherWallet.addresses.filter((addr) => addr.networkId === BCH_NETWORK_ID)
    expect(
      walletService.walletHasAddressForNetwork(otherWallet, BCH_NETWORK_ID)
    ).toBe(true)
    expect(
      walletService.walletHasAddressForNetwork(otherWallet, XEC_NETWORK_ID)
    ).toBe(false)
  })
  it('Mocked wallet has no addresses', () => {
    const otherWallet = { ...mockedWallet }
    otherWallet.addresses = []
    expect(
      walletService.walletHasAddressForNetwork(otherWallet, BCH_NETWORK_ID)
    ).toBe(false)
    expect(
      walletService.walletHasAddressForNetwork(otherWallet, XEC_NETWORK_ID)
    ).toBe(false)
  })
})
