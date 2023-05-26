import prisma from 'prisma/clientInstance'
import * as paybuttonService from 'services/paybuttonService'
import { prismaMock } from 'prisma/mockedClient'
import { mockedPaybutton, mockedPaybuttonList, mockedNetwork, mockedWalletsOnUserProfile } from '../mockedObjects'

describe('Fetch services', () => {
  it('Should fetch paybutton by id', async () => {
    prismaMock.paybutton.findUniqueOrThrow.mockResolvedValue(mockedPaybutton)
    prisma.paybutton.findUniqueOrThrow = prismaMock.paybutton.findUniqueOrThrow

    const result = await paybuttonService.fetchPaybuttonById(mockedPaybutton.id)
    expect(result).toEqual(mockedPaybutton)
  })

  it('Should fetch all paybuttons by userId', async () => {
    prismaMock.paybutton.findMany.mockResolvedValue(mockedPaybuttonList)
    prisma.paybutton.findMany = prismaMock.paybutton.findMany

    const result = await paybuttonService.fetchPaybuttonArrayByUserId('mocked-uid')
    expect(result).toEqual(mockedPaybuttonList)
  })
})

describe('Create services', () => {
  it('Should return paybutton nested', async () => {
    prismaMock.paybutton.create.mockResolvedValue(mockedPaybutton)
    prisma.paybutton.create = prismaMock.paybutton.create
    prismaMock.address.findMany.mockResolvedValue([])
    prisma.address.findMany = prismaMock.address.findMany
    prismaMock.addressesOnUserProfiles.upsert.mockResolvedValue(mockedWalletsOnUserProfile)
    prisma.addressesOnUserProfiles.upsert = prismaMock.addressesOnUserProfiles.upsert

    prismaMock.$transaction.mockImplementation(
      (fn: (prisma: any) => any) => {
        return fn(prisma)
      }
    )
    prisma.$transaction = prismaMock.$transaction

    prismaMock.address.upsert.mockResolvedValue(mockedPaybutton.addresses[0].address)
    prisma.address.upsert = prismaMock.address.upsert

    prismaMock.network.findUnique.mockResolvedValue(mockedNetwork)
    prisma.network.findUnique = prismaMock.network.findUnique
    const createPaybuttonInput = {
      userId: 'mocked-uid',
      name: 'mocked-name',
      prefixedAddressList: ['mockednetwork:mockaddress'],
      buttonData: '',
      walletId: 'mocked-wallet-uuid'
    }
    const result = await paybuttonService.createPaybutton(createPaybuttonInput)
    expect(result).toEqual(mockedPaybutton)
  })
})

describe('Delete services', () => {
  it('Should delete paybutton', async () => {
    prismaMock.paybutton.delete.mockResolvedValue(mockedPaybutton)
    prisma.paybutton.delete = prismaMock.paybutton.delete

    prismaMock.paybutton.findUniqueOrThrow.mockResolvedValue(mockedPaybutton)
    prisma.paybutton.findUniqueOrThrow = prismaMock.paybutton.findUniqueOrThrow

    prismaMock.address.findMany.mockResolvedValue([])
    prisma.address.findMany = prismaMock.address.findMany
    prismaMock.addressesOnUserProfiles.delete.mockResolvedValue(mockedWalletsOnUserProfile)
    prisma.addressesOnUserProfiles.delete = prismaMock.addressesOnUserProfiles.delete
    prismaMock.$transaction.mockImplementation(
      (fn: (prisma: any) => any) => {
        return fn(prisma)
      }
    )
    prisma.$transaction = prismaMock.$transaction

    const deletePaybuttonInput = {
      userId: 'mocked-uid',
      paybuttonId: 'mocked-uuid'
    }
    const result = await paybuttonService.deletePaybutton(deletePaybuttonInput)
    expect(result).toEqual(mockedPaybutton)
  })
})

describe('Update services', () => {
  it('Should return paybutton nested', async () => {
    prismaMock.paybutton.update.mockResolvedValue(mockedPaybutton)
    prisma.paybutton.update = prismaMock.paybutton.update
    prismaMock.addressesOnButtons.deleteMany.mockResolvedValue({ count: 0 })
    prismaMock.address.findMany.mockResolvedValue([])
    prisma.address.findMany = prismaMock.address.findMany
    prisma.addressesOnButtons.deleteMany = prismaMock.addressesOnButtons.deleteMany
    prisma.addressesOnButtons.deleteMany = prismaMock.addressesOnButtons.deleteMany
    prismaMock.$transaction.mockImplementation(
      (fn: (prisma: any) => any) => {
        return fn(prisma)
      }
    )
    prisma.$transaction = prismaMock.$transaction

    prismaMock.network.findUnique.mockResolvedValue(mockedNetwork)
    prisma.network.findUnique = prismaMock.network.findUnique
    const updatePaybuttonInput = {
      userId: 'mocked-uid',
      name: 'mocked-name',
      paybuttonId: 'mocked-uuid',
      walletId: 'mocked-wallet-uuid',
      prefixedAddressList: ['ecash:mockaddress']
    }
    const result = await paybuttonService.updatePaybutton(updatePaybuttonInput)
    expect(result).toEqual(mockedPaybutton)
  })
})
