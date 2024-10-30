import { setSession } from 'utils/setSession'
import * as userService from 'services/userService'
import { parseUpdatePUTRequest } from 'utils/validators'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res, true)
  const session = req.session
  if (req.method === 'GET') {
    const user = await userService.fetchUserProfileFromId(session.userId)
    res.status(200).json(user)
  }

  if (req.method === 'PUT') {
    const preferredCurrencyIdObject = parseUpdatePUTRequest(req.body)
    const user = await userService.updatePreferredCurrency(session.userId, preferredCurrencyIdObject.currencyId)
    res.status(200).json(user)
  }
}
