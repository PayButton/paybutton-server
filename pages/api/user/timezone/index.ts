import { setSession } from 'utils/setSession'
import * as userService from 'services/userService'
import { parseUpdateUserTimezonePUTRequest } from 'utils/validators'
import { clearDashboardCache } from 'redis/dashboardCache'
import { RESPONSE_MESSAGES } from 'constants/index'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res, true)

  if (req.method === 'PUT') {
    const session = req.session
    let preferredTimezone
    try {
      preferredTimezone = parseUpdateUserTimezonePUTRequest(req.body ?? {})
    } catch {
      res.status(RESPONSE_MESSAGES.INVALID_TIMEZONE_FORM_400.statusCode)
        .json(RESPONSE_MESSAGES.INVALID_TIMEZONE_FORM_400)
      return
    }
    const user = await userService.updatePreferredTimezone(session.userId, preferredTimezone.timezone)
    await clearDashboardCache(session.userId)
    res.status(200).json(user)
  }
}
