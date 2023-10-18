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
    if (user.isAdmin !== true) {
      res.status(500).json({ message: 'unauthorised' })
    } else {
      res.status(200).json(await userService.fetchAllUsersWithSupertokens())
    }
  }
}
