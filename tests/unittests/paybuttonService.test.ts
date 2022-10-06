import prisma from 'prisma/clientInstance'
import * as paybuttonService from 'services/paybuttonService'
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

    prismaMock.network.findUnique.mockResolvedValue(mockedNetwork)
    prisma.network.findUnique = prismaMock.network.findUnique
    const createPaybuttonInput = {
      userId: 'mocked-uid',
      name: 'mocked-name',
      prefixedAddressList: ['mockednetwork:mockaddress'],
      buttonData: ''
    }
    const result = await paybuttonService.createPaybutton(createPaybuttonInput)
    expect(result).toEqual(mockedPaybutton)
  })
})