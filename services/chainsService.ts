import models from 'db/models/index'
import { Chain } from 'types'

export async function getChainFromSlug(slug: string): Promise<Chain> {
    return models.chains.findOne( { where: { slug: slug } })
}

export async function getAllChainSlugs (): Promise<Chain[]> {
    return models.chains.findAll( { attributes: [ 'slug' ] })
}
