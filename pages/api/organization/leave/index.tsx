import { setSession } from 'utils/setSession'
import { leaveOrganization } from 'services/organizationService'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res)
  if (req.method === 'POST') {
    const session = req.session
    void await leaveOrganization(session.userId)
    res.status(200).json({ success: true })
  }
}
