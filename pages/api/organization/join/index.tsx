import { setSession } from 'utils/setSession'
import { parseJoinOrganizationPOSTRequest } from 'utils/validators'
import { fetchUserProfileFromId } from 'services/userService'
import { joinOrganization } from 'services/organizationService'
import { RESPONSE_MESSAGES } from 'constants/index'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res)
  if (req.method === 'POST') {
    try {
      const session = req.session
      const user = await fetchUserProfileFromId(session.userId)

      if (user.organizationId !== null) {
        throw new Error(RESPONSE_MESSAGES.USER_ALREADY_HAS_ORGANIZATION_400.message)
      }
      if (req.body.token === '' || req.body.token === undefined) {
        throw new Error(RESPONSE_MESSAGES.INVITATION_TOKEN_NOT_PROVIDED_400.message)
      }
      const { userId, token } = parseJoinOrganizationPOSTRequest({
        userId: session.userId,
        token: req.body.token
      })

      void await joinOrganization(userId, token)
      res.status(200).json({ success: true })
    } catch (err: any) {
      switch (err.message) {
        case RESPONSE_MESSAGES.USER_ALREADY_HAS_ORGANIZATION_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ALREADY_HAS_ORGANIZATION_400)
          break
        case RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.INVITATION_TOKEN_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVITATION_TOKEN_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.NO_USER_FOUND_404.message:
          res.status(404).json(RESPONSE_MESSAGES.NO_USER_FOUND_404)
          break
        case RESPONSE_MESSAGES.INVALID_INVITE_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVALID_INVITE_400)
          break
        case RESPONSE_MESSAGES.USER_HAS_ALREADY_USED_INVITE_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_HAS_ALREADY_USED_INVITE_400)
          break
        case RESPONSE_MESSAGES.INVITE_EXPIRED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVITE_EXPIRED_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
