import { Chain } from '@prisma/client'
import prisma from 'prisma/clientInstance'

export async function getChainFromSlug (slug: string): Promise<Chain | null> {
  return await prisma.network.findUnique({ where: { slug: slug } })
}

export async function getAllChainSlugs (): Promise<string[] | null> {
  const networks = await prisma.network.findMany({
    select: {
      slug: true
    }
  })
  return networks.map((obj: { slug: string }) => obj.slug)
}
