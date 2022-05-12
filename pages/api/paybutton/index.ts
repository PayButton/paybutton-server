import { NextApiRequest, NextApiResponse } from 'next'
import { PayButton } from 'types'
import models from 'db/models/index'

const generateIdFromUserId = userId => Math.random().toString(16).slice(2)

const createResource = (userId: string, addresses: string[]): Promise<PayButton> => {
    return models.paybuttons.create({
        providerUserId: userId,
        addresses: addresses.map(
            function (addr: string) {
                return { address: addr}
            })
    }, {
        include: [ models.paybuttons.addresses ]
    })
}

const fetchResource = (userIdFromQuery: string): PayButton[] => {
    const userId = userIdFromQuery || "test-user-id"
    const temp_addresses = ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc', 'bitcoincash:qrw5fzqlxzf639m8s7fq7wn33as7nfw9wg9zphxlxe']
    return  [{
        	id: generateIdFromUserId(userId),
		userId,
		addresses: temp_addresses
	    }]
}


export default (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method == 'POST') {
        const values = JSON.parse(req.body)
        const userId = values.userId
        const addressesList = values.addresses.split('\n')
        createResource(userId, addressesList).then(
            function (paybutton) {
                res.status(200).json(paybutton);
            }).catch(function(err) {
                res.status(500).json({ statusCode: 500, message: err.message })
            })
    }
    else if (req.method == 'GET') {
        try {
            const response = fetchResource('mocked-user-id');
            if (!response) {
                throw new Error('Could not fetch resource')
            }
            res.status(200).json(response)
        } catch (err: any) {
            res.status(500).json({ statusCode: 500, message: err.message })
        }
    }
}
