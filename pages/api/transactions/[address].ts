import { NextApiResponse, NextApiRequest } from 'next'
import { getAddress } from 'services/bchdService'
import { RESPONSE_MESSAGES } from 'constants/index'

const { ADDRESS_NOT_PROVIDED_400 } = RESPONSE_MESSAGES

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    const address = req.query.address as string
    try {
      if (address === '' || address === undefined) {
        throw new Error(ADDRESS_NOT_PROVIDED_400.message)
      }
      const response = await getAddress(address)
      res.status(200).send(response)
    } catch (err: any) {
      switch (err.message) {
        case ADDRESS_NOT_PROVIDED_400.message:
          res.status(ADDRESS_NOT_PROVIDED_400.statusCode).json(ADDRESS_NOT_PROVIDED_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
