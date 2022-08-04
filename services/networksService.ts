import { Network } from '@prisma/client'
import prisma from 'prisma/clientInstance'

export async function getNetworkFromSlug (slug: string): Promise<Network | null> {
  return await prisma.network.findUnique({ where: { slug: slug } })
}

export async function getAllNetworkSlugs (): Promise<string[] | null> {
  const networks = await prisma.network.findMany({
    select: {
      slug: true
    }
  })
  return networks.map((obj: { slug: string }) => obj.slug)
}
