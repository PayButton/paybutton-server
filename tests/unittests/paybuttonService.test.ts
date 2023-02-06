import prisma from 'prisma/clientInstance'
import * as paybuttonService from 'services/paybuttonService'
import * as validators from 'utils/validators'
import { prismaMock } from 'prisma/mockedClient'
import { mockedPaybutton, mockedPaybuttonList, mockedNetwork } from '../mockedObjects'

describe('Fetch services', () => {
  it('Should fetch paybutton by id', async () => {
    prismaMock.paybutton.findUnique.mockResolvedValue(mockedPaybutton)
    prisma.paybutton.findUnique = prismaMock.paybutton.findUnique

    const result = await paybuttonService.fetchPaybuttonById(4)
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

    jest.spyOn(validators, 'parseAddress').mockImplementation((addr: string | undefined) => {
      return addr ?? '-'
    })

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
      walletId: 1,
      name: 'mocked-name',
      prefixedAddressList: ['mockednetwork:mockaddress'],
      buttonData: ''
    }
    const result = await paybuttonService.createPaybutton(createPaybuttonInput)
    expect(result).toEqual(mockedPaybutton)
  })
})

describe('Delete services', () => {
  it('Should delete paybutton', async () => {
    prismaMock.paybutton.delete.mockResolvedValue(mockedPaybutton)
    prisma.paybutton.delete = prismaMock.paybutton.delete

    prismaMock.paybutton.findUnique.mockResolvedValue(mockedPaybutton)
    prisma.paybutton.findUnique = prismaMock.paybutton.findUnique

    const deletePaybuttonInput = {
      userId: 'mocked-uid',
      paybuttonId: 3
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
      prefixedAddressList: ['mockednetwork:mockaddress']
    }
    const result = await paybuttonService.updatePaybutton(1, updatePaybuttonInput)
    expect(result).toEqual(mockedPaybutton)
  })
})
