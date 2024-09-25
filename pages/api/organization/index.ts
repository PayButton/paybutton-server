import { setSession } from 'utils/setSession'
import { parseCreateOrganizationPOSTRequest, parseUpdateOrganizationPUTRequest } from 'utils/validators'
import { createOrganization, deleteOrganization, updateOrganization } from 'services/organizationService'
import { RESPONSE_MESSAGES } from 'constants/index'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res, true)
  const session = req.session
  if (req.method === 'POST') {
    try {
      const parsedValues = parseCreateOrganizationPOSTRequest({
        ...req.body,
        userId: session.userId
      })
      const organization = await createOrganization(parsedValues)
      res.status(200).json({
        organization
      }
      )
    } catch (err: any) {
      switch (err.message) {
        case RESPONSE_MESSAGES.USER_ALREADY_HAS_ORGANIZATION_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ALREADY_HAS_ORGANIZATION_400)
          break
        case RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.ORGANIZATION_NAME_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.ORGANIZATION_NAME_NOT_PROVIDED_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { organizationId } = req.query
      await deleteOrganization(organizationId, session.userId)
      res.status(200).json({ message: 'Organization deleted successfully' })
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
  if (req.method === 'PUT') {
    try {
      const parsedValues = parseUpdateOrganizationPUTRequest({
        ...req.body,
        userId: session.userId
      })
      const organization = await updateOrganization(parsedValues)
      res.status(200).json({ organization })
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
