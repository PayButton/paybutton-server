import { RESPONSE_MESSAGES } from 'constants/index';
import { NextApiRequest, NextApiResponse } from 'next'
import { fetchTransactionsByPaybuttonId } from 'services/transactionService'
import * as paybuttonService from 'services/paybuttonService'
import { setSession } from 'utils/setSession'

export default async ( req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    await setSession(req, res)
    const userId = req.session.userId
    console.log("validou")
    const paybuttonId = req.query.id as string;
    try {
      const paybutton = await paybuttonService.fetchPaybuttonById(paybuttonId)
      if (paybutton.providerUserId !== userId) throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
        
      const transactions = await fetchTransactionsByPaybuttonId(paybuttonId);
      
      res
        .status(200)
        .json({ transactions });
    } catch (err: any) {
      if (err.message === RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404.message){
        res
        .status(RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404.statusCode)
        .json(RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404)
      }
      if (err.message === RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message){
        res
        .status(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.statusCode)
        .json(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400)
      }else{
        res
          .status(500)
          .json({ statusCode: 500, message: err.message })
      }
    }
  } else {
    res
      .status(405)
      .json(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED)
  }
}
