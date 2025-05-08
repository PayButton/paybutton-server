import { CacheGet } from 'redis/index'
import { fetchUserProfileFromId } from 'services/userService'
import { setSession } from 'utils/setSession'

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
    const resJSON = await CacheGet.dashboardData(userId, timezone, buttonIds)
    res.status(200).json(resJSON)
  }
}
