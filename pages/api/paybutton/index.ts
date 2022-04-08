import { NextApiRequest, NextApiResponse } from 'next'
import { PayButton } from 'types'
import models from 'db/models/index'

const createResource = async (userId: string, addresses: string[]):Promise<PayButton> => {
    const newPayButton = await models.paybuttons.create({ userId: userId })
    await Promise.all(addresses.map(async (address) => {
      await models.paybuttons_addresses.create({ paybutton_id: newPayButton.id, address })
    }))

    return {
        id: newPayButton.id,
        userId: userId,
        addresses: addresses
    }
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const body = JSON.parse(req.body)
    const { userId, addresses } = body
    console.log(userId)
    const response = await createResource(userId, addresses)
    res.status(201).json(response)
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: err.message })
  }
}

export default handler
