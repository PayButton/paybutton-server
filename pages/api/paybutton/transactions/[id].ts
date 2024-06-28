import { RESPONSE_MESSAGES } from 'constants/index';
import { NextApiRequest, NextApiResponse } from 'next'
import { fetchTransactionsByPaybuttonId } from 'services/transactionService'

export default async ( req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    const paybuttonId = req.query.id as string;
    try {
      const transactions = await fetchTransactionsByPaybuttonId(paybuttonId);
      
      res
        .status(200)
        .json({ transactions });
    } catch (err: any) {
      if (err.message === RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404.message){
        res
        .status(RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404.statusCode)
        .json(RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404)
      }else{
        res
          .status(500)
          .json({ statusCode: 500, message: err.message })
      }
    }
  } else {
    res
      .status(405)
      .json({ statusCode: 405, message: 'Method not allowed' })
  }
}
