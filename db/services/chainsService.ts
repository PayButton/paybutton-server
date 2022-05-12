import models from 'db/models/index'

export async function getChainFromSlug (slug: string) {
    return models.chains.findOne( { where: { slug: slug } })
}
