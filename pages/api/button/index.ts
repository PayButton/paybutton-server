import { NextApiRequest, NextApiResponse } from 'next'
import { ButtonResource } from 'types'

const generateIdFromUserId = userId => Math.random().toString(16).slice(2)

const createResource = (userId: string, addresses: string[]):ButtonResource => {
    return {
        id: generateIdFromUserId(userId),
        userId: userId,
        addresses: addresses
    }
}

export default (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const body = JSON.parse(req.body)
    const { userId, addresses } = body
    const response = createResource(userId, addresses);
    console.log(response)
    if (!response) {
      throw new Error('Could not create resource')
    }

    res.status(200).json(response)
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: err.message })
  }
}
