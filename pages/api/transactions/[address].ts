import { NextApiResponse, NextApiRequest } from 'next/types'
import { getAddress } from 'services/bchdService'
import { RESPONSE_MESSAGES } from 'constants/index'

const { ADDRESS_NOT_PROVIDED_400 } = RESPONSE_MESSAGES

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    try {
      const { address } = req.query

      if (address === '' || address === undefined) {
        res.status(ADDRESS_NOT_PROVIDED_400.statusCode).send({ message: ADDRESS_NOT_PROVIDED_400.message })
      }

      const response = await getAddress(address)
      res.status(200).send(response)
    } catch (e) {
      res.status(500).send(e.message)
    }
  }
}
