import { getSubbedAddresses } from 'services/chronikService'
import { fetchUserProfileFromId } from 'services/userService'
import { setSession } from 'utils/setSession'

export default async (req: any, res: any): Promise<void> => {
  await setSession(req, res, true)
  if (req.method === 'GET') {
    try {
      const session = req.session
      const user = await fetchUserProfileFromId(session.userId)
      if (user.isAdmin !== true) {
        throw new Error('unauthorised')
      }
      res.status(200).json(getSubbedAddresses())
    } catch (err: any) {
      switch (err.message) {
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
