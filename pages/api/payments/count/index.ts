import { fetchPaymentsCountByUserId } from 'services/transactionService'
import { setSession } from 'utils/setSession'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    await setSession(req, res)
    const userId = req.session.userId
    const paybuttonId = (req.query.paybuttonId === '' || req.query.paybuttonId === undefined) ? undefined : req.query.paybuttonId as string
    const paybuttonIds = paybuttonId !== undefined ? [paybuttonId] : undefined
    const resJSON = await fetchPaymentsCountByUserId(userId, paybuttonIds)
    res.status(200).json(resJSON)
  }
}
