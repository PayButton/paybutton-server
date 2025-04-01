import { CacheGet } from 'redis/index'
import { fetchUserProfileFromId } from 'services/userService'
import { setSession } from 'utils/setSession'
import { getFilteredTransactionCount } from 'services/transactionService'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    await setSession(req, res)
    const userId = req.session.userId
    const userReqTimezone = req.headers.timezone as string
    const userProfile = await fetchUserProfileFromId(userId)
    const userPreferredTimezone = userProfile?.preferredTimezone
    const timezone = userPreferredTimezone !== '' ? userPreferredTimezone : userReqTimezone

    let buttonIds: string[] | undefined
    if (typeof req.query.buttonIds === 'string' && req.query.buttonIds !== '') {
      buttonIds = (req.query.buttonIds as string).split(',')
    }

    if ((buttonIds != null) && buttonIds.length > 0) {
      const totalCount = await getFilteredTransactionCount(userId, buttonIds)
      res.status(200).json(totalCount)
    } else {
      const resJSON = await CacheGet.paymentsCount(userId, timezone)
      res.status(200).json(resJSON)
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
