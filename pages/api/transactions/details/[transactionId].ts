import { NextApiResponse, NextApiRequest } from 'next/types'
import { getTransactionDetails } from 'services/bchdService'

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  try {
    const { transactionId } = req.query

    if (transactionId === '' || transactionId === undefined) {
      res.send({ message: 'Missing Transaction ID parameter' })
    }

    const response = await getTransactionDetails(transactionId)
    res.status(200).send(response)
  } catch (e) {
    res.status(500).send(e.message)
  }
}
