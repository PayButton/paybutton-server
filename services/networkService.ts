import { Network, Prisma } from '@prisma/client'
import { RESPONSE_MESSAGES } from 'constants/index'
import prisma from 'prisma/clientInstance'
import { getBlockchainInfo, getBlockInfo } from 'services/grpcService'

export async function getNetworkFromSlug (slug: string): Promise<Network | null> {
  return await prisma.network.findUnique({ where: { slug } })
}

export interface ConnectionInfo {
  connected: boolean
  lastBlockTimestamp?: number
}

export interface NetworkWithConnectionInfo extends Network, ConnectionInfo {}

async function isConnected (networkSlug: string): Promise<ConnectionInfo> {
  try {
    const blockchainInfo = await getBlockchainInfo(networkSlug)
    const lastBlockInfo = await getBlockInfo(networkSlug, blockchainInfo.bestHeight)
    if (lastBlockInfo.info === undefined) throw new Error(RESPONSE_MESSAGES.COULD_NOT_GET_BLOCK_INFO.message)
    const lastBlockTimestamp = lastBlockInfo.info?.timestamp
    return {
      connected: true,
      lastBlockTimestamp
    }
  } catch (e: any) {
    return {
      connected: false
    }
  }
}

export async function getNetworks (includeTestNetworks?: boolean): Promise<NetworkWithConnectionInfo[] | null> {
  const findManyInput: Prisma.NetworkFindManyArgs = includeTestNetworks === true
    ? {}
    : {
        where: {
          slug: {
            in: ['ecash', 'bitcoincash']
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
