import * as paybuttonService from 'services/paybuttonService'
import { parseError } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'
import { setSession } from 'utils/setSession'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res)
  const userId = req.session.userId
  if (req.method === 'GET') {
    const paybuttonId = req.query.id as string
    try {
      const paybutton = await paybuttonService.fetchPaybuttonById(paybuttonId)
      if (paybutton == null) throw new Error(RESPONSE_MESSAGES.NOT_FOUND_404.message)
      res.status(200).json(paybutton)
    } catch (err: any) {
      switch (err.message) {
        case RESPONSE_MESSAGES.NOT_FOUND_404.message:
          res.status(404).json(RESPONSE_MESSAGES.NOT_FOUND_404)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
  if (req.method === 'DELETE') {
    const paybuttonId = req.query.id as string
    try {
      const deletedPaybutton = await paybuttonService.deletePaybutton({ paybuttonId, userId })
      res.status(200).json(deletedPaybutton)
    } catch (err: any) {
      const parsedError = parseError(err)
      switch (parsedError.message) {
        case RESPONSE_MESSAGES.NO_BUTTON_FOUND_404.message:
          res.status(404).json(RESPONSE_MESSAGES.NO_BUTTON_FOUND_404)
          break
        case RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message:
          res.status(400).json(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: parsedError.message })
      }
    }
  }
}
