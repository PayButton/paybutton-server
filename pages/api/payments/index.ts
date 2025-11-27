import { fetchAllPaymentsByUserIdWithPagination } from 'services/transactionService'
import { fetchUserProfileFromId } from 'services/userService'
import { setSession } from 'utils/setSession'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    await setSession(req, res)
    const userId = req.session.userId
    const user = await fetchUserProfileFromId(userId)
    const page = req.query.page as number
    const pageSize = req.query.pageSize as number
    const orderDesc: boolean = !!(req.query.orderDesc === '' || req.query.orderDesc === undefined || req.query.orderDesc === 'true')
    const orderBy = (req.query.orderBy === '' || req.query.orderBy === undefined) ? undefined : req.query.orderBy as string

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
    const userReqTimezone = req.headers.timezone as string
    const userPreferredTimezone = user?.preferredTimezone
    let timezone = userPreferredTimezone !== '' ? userPreferredTimezone : userReqTimezone
    if (timezone === '' || timezone === undefined || timezone === null) {
      const timezoneValue = timezone === '' ? 'an empty string' : (timezone === undefined ? 'undefined' : 'null')
      console.warn(`WARN: Payments API got timezone as ${timezoneValue}, defaulting to UTC`)
      timezone = 'UTC'
    }

    const resJSON = await fetchAllPaymentsByUserIdWithPagination(
      userId,
      page,
      pageSize,
      timezone,
      orderBy,
      orderDesc,
      buttonIds,
      years,
      startDate,
      endDate
    )
    res.status(200).json(resJSON)
  }
}
