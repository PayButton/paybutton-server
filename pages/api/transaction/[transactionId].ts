import { NextApiResponse, NextApiRequest } from 'next/types'
import { MultiBlockchainClient } from 'services/chronikService'
import { RESPONSE_MESSAGES } from 'constants/index'

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    const transactionId = req.query.transactionId as string
    const networkSlug = req.query.networkSlug as string
    try {
      if (transactionId === '' || transactionId === undefined) {
        throw new Error(RESPONSE_MESSAGES.TRANSACTION_ID_NOT_PROVIDED_400.message)
      }
      const response = await MultiBlockchainClient.getTransactionDetails(transactionId, networkSlug)
      res.status(200).json(response)
    } catch (err: any) {
      switch (err.message) {
        case RESPONSE_MESSAGES.TRANSACTION_ID_NOT_PROVIDED_400.message:
          res.status(RESPONSE_MESSAGES.TRANSACTION_ID_NOT_PROVIDED_400.statusCode).json(RESPONSE_MESSAGES.TRANSACTION_ID_NOT_PROVIDED_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
