import { Chain } from '@prisma/client'
import prisma from 'prisma/clientInstance'

export async function getChainFromSlug (slug: string): Promise<Chain | null> {
  return await prisma.chain.findUnique({ where: { slug } })
}

export async function getAllChainSlugs (): Promise<string[] | null> {
  const chains = await prisma.chain.findMany({
    select: {
      slug: true
    }
  })
  return chains.map((obj: { slug: string }) => obj.slug)
}
