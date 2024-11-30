import { CacheGet } from 'redis/index'
import { setSession } from 'utils/setSession'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    await setSession(req, res)
    const userId = req.session.userId
    const page = req.query.page as number
    const pageSize = req.query.pageSize as number

    const resJSON = await CacheGet.paymentListPaginated(userId, page, pageSize)
    res.status(200).json(resJSON)
  }
}
