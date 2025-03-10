import { Network, Prisma } from '@prisma/client'
import { RESPONSE_MESSAGES, NETWORK_SLUGS, NETWORK_IDS } from 'constants/index'
import prisma from 'prisma/clientInstance'
import { fetchAllUserAddresses } from 'services/addressService'
import config from 'config'
import { multiBlockchainClient } from './chronikService'

export function getNetworkIdFromSlug (slug: string): number {
  switch (slug) {
    case 'ecash':
      return NETWORK_IDS.XEC
    case 'bitcoincash':
      return NETWORK_IDS.BCH
    default:
      throw new Error(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.message)
  }
}

export async function getNetworkFromSlug (slug: string): Promise<Network> {
  const network = await prisma.network.findUnique({ where: { slug } })
  if (network === null) throw new Error(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.message)
  return network
}

export interface ConnectionInfo {
  connected: boolean
  maintenance: boolean
  lastBlockTimestamp?: number
}

export interface NetworkWithConnectionInfo extends Network, ConnectionInfo {}

async function isConnected (networkSlug: string): Promise<ConnectionInfo> {
  try {
    return {
      connected: true,
      lastBlockTimestamp: await multiBlockchainClient.getLastBlockTimestamp(networkSlug),
      maintenance: config.networksUnderMaintenance[networkSlug]
    }
  } catch (e: any) {
    return {
      connected: false,
      maintenance: config.networksUnderMaintenance[networkSlug]
    }
  }
}

export async function getNetworks (includeTestNetworks?: boolean): Promise<NetworkWithConnectionInfo[] | null> {
  const findManyInput: Prisma.NetworkFindManyArgs = includeTestNetworks === true
    ? {}
    : {
        where: {
          slug: {
            in: [NETWORK_SLUGS.ecash, NETWORK_SLUGS.bitcoincash]
          }
        }
      }
  const networks = await prisma.network.findMany(findManyInput)

  const networksWithConnectionInfo = await Promise.all(
    networks.map(async (network) => {
      return {
        ...network,
        ...await isConnected(network.slug)
      }
    })
  )
  return networksWithConnectionInfo
}

export async function getAllNetworkSlugs (): Promise<string[] | null> {
  const networks = await prisma.network.findMany({
    select: {
      slug: true
    }
  })
  return networks.map((obj: { slug: string }) => obj.slug)
}

export async function getUserNetworks (userId: string): Promise<Network[] | null> {
  const allNetworkIds = Object.values(NETWORK_IDS)
  const networks = await prisma.network.findMany({ where: { id: { in: allNetworkIds } } })
  const userAddresses = await fetchAllUserAddresses(userId)
  const userNetworkIds = new Set()
  for (const addr of userAddresses) {
    userNetworkIds.add(addr.networkId)
    if (userNetworkIds.size === allNetworkIds.length) break
  }
  return networks.filter(n => userNetworkIds.has(n.id))
}

export interface UserNetworksInfo {
  ticker: string
}
