import { NextApiResponse, NextApiRequest } from 'next'
import { parseAddress } from 'utils/validators'
import { syncTransactions } from 'services/transactionsService'
import { RESPONSE_MESSAGES } from 'constants/index'

const { ADDRESS_NOT_PROVIDED_400, INVALID_ADDRESS_400, SUCCESSFULLY_SYNCED_200 } = RESPONSE_MESSAGES

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    try {
      const address = parseAddress(req.query.address as string)
      if (address === '' || address === undefined) {
        throw new Error(ADDRESS_NOT_PROVIDED_400.message)
      }
      await syncTransactions(address)
      res.status(200).send(SUCCESSFULLY_SYNCED_200)
    } catch (err: any) {
      switch (err.message) {
        case ADDRESS_NOT_PROVIDED_400.message:
          res.status(ADDRESS_NOT_PROVIDED_400.statusCode).json(ADDRESS_NOT_PROVIDED_400)
          break
        case INVALID_ADDRESS_400.message:
          res.status(INVALID_ADDRESS_400.statusCode).json(INVALID_ADDRESS_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
