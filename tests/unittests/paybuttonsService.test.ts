import prisma from 'prisma/clientInstance'
import * as paybuttonsService from 'services/paybuttonsService'
import { prismaMock } from 'prisma/mockedClient'
import { mockedPaybutton, mockedPaybuttonList, mockedChain } from '../mockedModels'

describe('Fetch services', () => {
  it('Should fetch paybutton by id', async () => {
    prismaMock.paybutton.findUnique.mockResolvedValue(mockedPaybutton)
    prisma.paybutton.findUnique = prismaMock.paybutton.findUnique

    const result = await paybuttonsService.fetchPaybuttonById(4)
    expect(result).toEqual(mockedPaybutton)
  })

  it('Should fetch all paybuttons by userId', async () => {
    prismaMock.paybutton.findMany.mockResolvedValue(mockedPaybuttonList)
    prisma.paybutton.findMany = prismaMock.paybutton.findMany

    const result = await paybuttonsService.fetchPaybuttonArrayByUserId('mocked-uid')
    expect(result).toEqual(mockedPaybuttonList)
  })
})

describe('Create services', () => {
  it('Should return paybutton nested', async () => {
    prismaMock.paybutton.create.mockResolvedValue(mockedPaybutton)
    prisma.paybutton.create = prismaMock.paybutton.create

    prismaMock.chain.findUnique.mockResolvedValue(mockedChain)
    prisma.chain.findUnique = prismaMock.chain.findUnique
    const result = await paybuttonsService.createPaybutton('mocked-uid', 'mocked-name', ['mockedchain:mockaddress'])
    expect(result).toEqual(mockedPaybutton)
  })
})
