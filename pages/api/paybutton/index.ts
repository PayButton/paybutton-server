import { NextApiRequest, NextApiResponse } from 'next'
import { PayButton } from 'types'
import * as paybuttonsService from 'services/paybuttonsService'

const generateIdFromUserId = userId => Math.random().toString(16).slice(2)


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
        const prefixedAddressList = values.addresses.trim().split('\n')
        paybuttonsService.createPaybutton(userId, prefixedAddressList).then(
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
