import models from 'db/models/index'
import { PayButton } from 'types'
import * as chainService from 'services/chainsService'

export async function createPaybutton (userId: string, prefixedAddressList: string[]): Promise<PayButton>  {
    const result = await models.sequelize.transaction(async (t) => {
        let paybutton = await models.paybuttons.create({
            providerUserId: userId,
        }, { transaction: t } )

        for (let i=0; i < prefixedAddressList.length; i++) {
            let addressWithPrefix = prefixedAddressList[i];
            const [prefix, address] =  addressWithPrefix.split(':');
            const chain = await chainService.getChainFromSlug(prefix)
            await models.paybutton_addresses.create({
                address: address,
                chainId:  chain.id,
                paybuttonId: paybutton.id
            }, { transaction: t } );
        }
        return paybutton
    });
    /* This query is needed to eager load the `paybuttons` object.
     * If result is returned directly, we won't be able to access 
     * its addresses.
     */
    return await models.paybuttons.findOne({
        where: {
            id: result.id
        },
        include: {
            all: true,
            nested: true
        }
    })
}

export async function fetchPaybuttonById (paybuttonId: string): Promise<PayButton>  {
  return models.paybuttons.findOne( { where: { id: paybuttonId }} )
}

export async function fetchPaybuttonListByUserId (userId: string): Promise<PayButton[]>  {
  return models.paybuttons.findAll( { where: { providerUserId: userId }} )
}
