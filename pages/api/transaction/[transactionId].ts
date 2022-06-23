import { NextApiResponse, NextApiRequest } from 'next/types'
import { getTransactionDetails } from 'services/bchdService'
import { RESPONSE_MESSAGES } from 'constants/index'

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  try {
    const { transactionId } = req.query

    if (transactionId === '' || transactionId === undefined) {
      res.status(400).send({ message: RESPONSE_MESSAGES.TRANSACTION_ID_NOT_PROVIDED_400.message })
    }

    const response = await getTransactionDetails(transactionId)
    res.status(200).send(response)
  } catch (e) {
    res.status(500).send(e.message)
  }
}
