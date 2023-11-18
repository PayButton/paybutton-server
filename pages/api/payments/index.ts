import { CacheGet } from 'redis/index'
import { setSession } from 'utils/setSession'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    await setSession(req, res)
    const userId = req.session.userId
    const cache = req.query.cache as boolean
    let resJSON: any
    if (cache) {
      resJSON = await CacheGet.dashboardData(userId)
    } else {
      resJSON = await CacheGet.paymentList(userId)
    }
    res.status(200).json(resJSON)
  }
}
