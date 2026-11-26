import { fetchSyncStatus } from 'services/syncStatusService'
import { fetchUserProfileFromId } from 'services/userService'
import { setSession } from 'utils/setSession'

export default async (req: any, res: any): Promise<void> => {
  await setSession(req, res, true)
  if (req.method !== 'GET') {
    res.status(405).json({ statusCode: 405, message: 'method not allowed' })
    return
  }
  try {
    const user = await fetchUserProfileFromId(req.session.userId)
    if (user.isAdmin !== true) {
      res.status(403).json({ statusCode: 403, message: 'unauthorised' })
      return
    }
    res.status(200).json(await fetchSyncStatus())
  } catch (err: any) {
    res.status(500).json({ statusCode: 500, message: err.message })
  }
}
