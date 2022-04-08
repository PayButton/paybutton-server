import { NextApiResponse, NextApiRequest } from "next/types"
import { PayButton } from "types"
import models from 'db/models/index'

const fetchResource = async (payButtonId: string): Promise<PayButton> => {
    const query = {
      where: {
        id: payButtonId
      },
      include: [
        {
          model: models.paybuttons_addresses,
          as: 'addresses'
        },
        {
          model: models.users,
          as: 'users'
        }
      ]
    }

    const payButton = await models.paybuttons.findOne(query)
    return {
      userId: payButton.users[0].id,
      id: payButton.id,
      addresses: payButton.addresses
    }
}

export default (
    req: NextApiRequest,
    res: NextApiResponse
) => {
    const payButtonId = req.query.id as string
    const response = fetchResource(payButtonId);
    if (response) res.status(200).json(response)
    if (!response) res.status(404).json({ error: 'Not found' });
}
