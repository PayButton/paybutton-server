import { fetchAllPaymentsByUserId } from 'services/transactionService'
import { setSession } from 'utils/setSession'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    await setSession(req, res)
    const userId = req.session.userId
    const page = req.query.page as number
    const pageSize = req.query.pageSize as number
    const orderDesc: boolean = !!(req.query.orderDesc === '' || req.query.orderDesc === undefined || req.query.orderDesc === 'true')
    const orderBy = (req.query.orderBy === '' || req.query.orderBy === undefined) ? undefined : req.query.orderBy as string

    const resJSON = await fetchAllPaymentsByUserId(userId, page, pageSize, orderBy, orderDesc)
    res.status(200).json(resJSON)
  }
}
