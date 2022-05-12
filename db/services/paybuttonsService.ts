import models from 'db/models/index'
import { PayButton } from 'types'
import * as chainService from 'db/services/chainsService'

export async function createPaybutton (userId: string, prefixedAddressList: string[]): Promise<PayButton>  {
    return await models.sequelize.transaction(async (t) => {
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
}
