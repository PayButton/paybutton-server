import { setSession } from 'utils/setSession'
import * as userService from 'services/userService'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res, true)
  if (req.method === 'GET') {
    const session = req.session
    const user = await userService.fetchUserProfileFromId(session.userId)
    res.status(200).json(user)
  }
}
