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
    let years: string[] | undefined
    if (typeof req.query.years === 'string' && req.query.years !== '') {
      years = (req.query.years as string).split(',')
    }
    let startDate: string | undefined
    if (typeof req.query.startDate === 'string' && req.query.startDate !== '') {
      startDate = req.query.startDate as string
    }
    let endDate: string | undefined
    if (typeof req.query.endDate === 'string' && req.query.endDate !== '') {
      endDate = req.query.endDate as string
    }
    if (((buttonIds !== undefined) && buttonIds.length > 0) ||
        ((years !== undefined) && years.length > 0) ||
        (startDate !== undefined && endDate !== undefined && startDate !== '' && endDate !== '')) {
      const totalCount = await getFilteredTransactionCount(userId, buttonIds, years, timezone, startDate, endDate)
      res.status(200).json(totalCount)
    } else {
      const totalCount = await CacheGet.paymentsCount(userId, timezone)
      res.status(200).json(totalCount)
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
