import prisma from 'prisma/clientInstance'
import { Prisma, Paybutton, Address } from '@prisma/client'
import * as walletService from 'services/walletService'
import * as addressService from 'services/addressService'
import { prismaMock } from 'prisma/mockedClient'
import { RESPONSE_MESSAGES } from 'constants/index'
import { mockedWallet, mockedWalletsOnUserProfile, mockedWalletList, mockedPaybuttonList, mockedPaybutton, mockedNetwork, mockedBCHAddress } from '../mockedObjects'

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
    prismaMock.$transaction.mockImplementation(
      (fn: (prisma: any) => any) => {
        return fn(prisma)
      }
    )
    prisma.$transaction = prismaMock.$transaction
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

describe('Update services', () => {
  interface Data {
    updateWalletInput: walletService.UpdateWalletInput
  }
  let data: Data = {
    updateWalletInput: {
      name: '',
      isXECDefault: undefined,
      isBCHDefault: undefined,
      paybuttonIdList: [1]
    }
  }

  beforeEach(() => {
    data = {
      updateWalletInput: {
        name: 'mockedWallet',
        isXECDefault: undefined,
        isBCHDefault: undefined,
        paybuttonIdList: [1]
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

    prismaMock.network.findUnique.mockResolvedValue(mockedNetwork)
    prisma.network.findUnique = prismaMock.network.findUnique
    prismaMock.paybutton.findMany.mockResolvedValue([mockedPaybuttonList[0]])
    prisma.paybutton.findMany = prismaMock.paybutton.findMany
  })

  it('Update wallet', async () => {
    const result = await walletService.updateWallet(mockedWallet.id, data.updateWalletInput)
    expect(result).toEqual(mockedWallet)
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
    const otherWalletButton = {
      ...mockedPaybutton
    }
    otherWalletButton.addresses[0].address.walletId = 2
    prismaMock.paybutton.findMany.mockResolvedValue([otherWalletButton])
    prisma.paybutton.findMany = prismaMock.paybutton.findMany
    expect.assertions(1)
    try {
      await walletService.updateWallet(mockedWallet.id, data.updateWalletInput)
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.ADDRESS_ALREADY_BELONGS_TO_WALLET_400.message)
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
  it('Fail if trying to set as BCH Default with no BCH addresses', async () => {
    data.updateWalletInput.isBCHDefault = true
    prismaMock.walletsOnUserProfile.update.mockResolvedValue(mockedWalletsOnUserProfile)
    prisma.walletsOnUserProfile.update = prismaMock.walletsOnUserProfile.update
    const noBCHAddressWallet = {
      ...mockedWallet,
      addresses: [
        {
          id: 2,
          address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
          networkId: 1
        }
      ]
    }

    prismaMock.wallet.findUnique.mockResolvedValue(noBCHAddressWallet)
    prisma.wallet.findUnique = prismaMock.wallet.findUnique
    prismaMock.wallet.update.mockResolvedValue(noBCHAddressWallet)
    prisma.wallet.update = prismaMock.wallet.update
    expect.assertions(1)
    try {
      await walletService.updateWallet(mockedWallet.id, data.updateWalletInput)
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.DEFAULT_BCH_WALLET_MUST_HAVE_SOME_BCH_ADDRESS_400.message)
    }
  })
  it('Fail if trying to set as XEC Default with no XEC addresses', async () => {
    data.updateWalletInput.isXECDefault = true
    prismaMock.walletsOnUserProfile.update.mockResolvedValue(mockedWalletsOnUserProfile)
    prisma.walletsOnUserProfile.update = prismaMock.walletsOnUserProfile.update
    const noXECAddressWallet = {
      ...mockedWallet,
      addresses: [
        {
          id: 2,
          address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
          networkId: 2
        }
      ]
    }

    prismaMock.wallet.findUnique.mockResolvedValue(noXECAddressWallet)
    prisma.wallet.findUnique = prismaMock.wallet.findUnique
    prismaMock.wallet.update.mockResolvedValue(noXECAddressWallet)
    prisma.wallet.update = prismaMock.wallet.update
    expect.assertions(1)
    try {
      await walletService.updateWallet(mockedWallet.id, data.updateWalletInput)
    } catch (e: any) {
      expect(e.message).toMatch(RESPONSE_MESSAGES.DEFAULT_XEC_WALLET_MUST_HAVE_SOME_XEC_ADDRESS_400.message)
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
