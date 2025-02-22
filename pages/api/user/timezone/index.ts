import { setSession } from 'utils/setSession'
import * as userService from 'services/userService'
import { parseUpdateUserTimezonePUTRequest } from 'utils/validators'
import { clearDashboardCache } from 'redis/dashboardCache'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res, true)

  if (req.method === 'PUT') {
    const session = req.session
    const preferredTimezone = parseUpdateUserTimezonePUTRequest(req.body)
    const user = await userService.updatePreferredTimezone(session.userId, preferredTimezone.timezone)
    await clearDashboardCache(session.userId)
    res.status(200).json(user)
  }
}
