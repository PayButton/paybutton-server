import prisma from 'prisma/clientInstance'
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

    // Read the buttonIds query parameter (if any)
    let buttonIds: string[] | undefined
    if (typeof req.query.buttonIds === 'string' && req.query.buttonIds !== '') {
      buttonIds = (req.query.buttonIds as string).split(',')
    }

    if ((buttonIds != null) && buttonIds.length > 0) {
      // When filtering by paybutton, bypass cache and build the count query
      const whereClause: any = {
        address: {
          userProfiles: {
            some: { userId }
          },
          // Filter transactions by a related paybutton via the intermediate table
          paybuttons: {
            some: {
              paybutton: { id: { in: buttonIds } }
            }
          }
        },
        amount: { gt: 0 }
      }

      const totalCount = await prisma.transaction.count({
        where: whereClause
      })
      res.status(200).json(totalCount)
    } else {
      // No filtering provided, use the cached count
      const resJSON = await CacheGet.paymentsCount(userId, timezone)
      res.status(200).json(resJSON)
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
