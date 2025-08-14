import * as networkService from 'services/networkService'
import prisma from 'prisma-local/clientInstance'
import { prismaMock } from 'prisma-local/mockedClient'
import { mockedBCHAddress, mockedXECAddress } from '../mockedObjects'
import { networks } from 'prisma-local/seeds/networks'
import { NETWORK_IDS } from 'constants/index'

const mainNetworkIds = Object.values(NETWORK_IDS)
const mainNetworks = networks.filter(n => mainNetworkIds.includes(n.id))

it('Get 1 network for user', async () => {
  prismaMock.network.findMany.mockResolvedValue(mainNetworks)
  prisma.network.findMany = prismaMock.network.findMany

  prismaMock.address.findMany.mockResolvedValue([mockedBCHAddress])
  prisma.address.findMany = prismaMock.address.findMany

  const userNetworks = await networkService.getUserNetworks('mock-uid')
  expect(userNetworks).toStrictEqual([mainNetworks.find(n => n.id === NETWORK_IDS.BCH)])
})

it('Get 2 networks for user', async () => {
  prismaMock.network.findMany.mockResolvedValue(mainNetworks)
  prisma.network.findMany = prismaMock.network.findMany

  prismaMock.address.findMany.mockResolvedValue([mockedBCHAddress, mockedXECAddress])
  prisma.address.findMany = prismaMock.address.findMany

  const userNetworks = await networkService.getUserNetworks('mock-uid')
  expect(userNetworks).toStrictEqual(mainNetworks)
})

it('Get 0 networks for user', async () => {
  prismaMock.network.findMany.mockResolvedValue(mainNetworks)
  prisma.network.findMany = prismaMock.network.findMany

  prismaMock.address.findMany.mockResolvedValue([])
  prisma.address.findMany = prismaMock.address.findMany

  const userNetworks = await networkService.getUserNetworks('mock-uid')
  expect(userNetworks).toStrictEqual([])
})
