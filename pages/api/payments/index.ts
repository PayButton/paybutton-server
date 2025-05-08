import { fetchAllPaymentsByUserIdWithPagination } from 'services/transactionService'
import { setSession } from 'utils/setSession'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    await setSession(req, res)
    const userId = req.session.userId
    const page = req.query.page as number
    const pageSize = req.query.pageSize as number
    const orderDesc: boolean = !!(req.query.orderDesc === '' || req.query.orderDesc === undefined || req.query.orderDesc === 'true')
    const orderBy = (req.query.orderBy === '' || req.query.orderBy === undefined) ? undefined : req.query.orderBy as string

    let buttonIds: string[] | undefined
    if (typeof req.query.buttonIds === 'string' && req.query.buttonIds !== '') {
      buttonIds = (req.query.buttonIds as string).split(',')
    }

    const resJSON = await fetchAllPaymentsByUserIdWithPagination(
      userId,
      page,
      pageSize,
      orderBy,
      orderDesc,
      buttonIds
    )
    res.status(200).json(resJSON)
  }
}
