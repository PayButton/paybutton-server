import { setSession } from 'utils/setSession'
import { createOrganizationInviteForUser, fetchAllOrganizationInvitesForUser, getUrlFromToken, refreshInvite } from 'services/organizationService'
import { RESPONSE_MESSAGES } from 'constants/index'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res, true)
  const session = req.session
  if (req.method === 'GET') {
    try {
      const invites = await fetchAllOrganizationInvitesForUser(session.userId)
      let invite = null
      if (invites.length > 0) {
        invite = invites[0]
        await refreshInvite(invite.id)
      } else {
        invite = await createOrganizationInviteForUser(session.userId)
      }
      const url = getUrlFromToken(invite.token)
      res.status(200).json({ url })
    } catch (err: any) {
      switch (err.message) {
        case RESPONSE_MESSAGES.USER_HAS_NO_ORGANIZATION_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_HAS_NO_ORGANIZATION_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
