import { setSession } from 'utils/setSession'
import * as userService from 'services/userService'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res, true)
  if (req.method === 'POST') {
    const session = req.session
    await userService.updateLastSentVerificationEmailAt(session.userId)
    res.status(200).json({ success: true })
  }
}
