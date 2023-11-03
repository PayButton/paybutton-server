import { NextApiRequest, NextApiResponse } from 'next'
import { fetchTxCount } from 'services/transactionService'
import { RESPONSE_MESSAGES } from 'constants/index'
import { parseAddress } from 'utils/validators'

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    try {
      if (req.query.address === '' || req.query.address === undefined) {
        throw new Error(RESPONSE_MESSAGES.ADDRESS_NOT_PROVIDED_400.message)
      }
      const address = parseAddress(req.query.address as string)
      const count = await fetchTxCount(address)
      res.status(200).send(count)
    } catch (err: any) {
      switch (err.message) {
        case RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.MULTIPLE_USER_IDS_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.MULTIPLE_USER_IDS_PROVIDED_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
