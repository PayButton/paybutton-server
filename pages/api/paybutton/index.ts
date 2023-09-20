import * as paybuttonService from 'services/paybuttonService'
import { parseError, parsePaybuttonPOSTRequest } from 'utils/validators'
import { setSession } from 'utils/setSession'
import { RESPONSE_MESSAGES } from 'constants/index'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'POST') {
    await setSession(req, res)
    const values = req.body
    values.userId = req.session.userId
    try {
      const createPaybuttonInput = parsePaybuttonPOSTRequest(values)
      const paybutton = await paybuttonService.createPaybutton(createPaybuttonInput)
      res.status(200).json(paybutton)
    } catch (err: any) {
      const parsedErr = parseError(err)
      switch (parsedErr.message) {
        case RESPONSE_MESSAGES.INVALID_WEBSITE_URL_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVALID_WEBSITE_URL_400)
          break
        case RESPONSE_MESSAGES.INVALID_ADDRESS_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVALID_ADDRESS_400)
          break
        case RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.PAYBUTTON_NAME_ALREADY_EXISTS_400.message:
          res.status(400).json(RESPONSE_MESSAGES.PAYBUTTON_NAME_ALREADY_EXISTS_400)
          break
        case RESPONSE_MESSAGES.INVALID_BUTTON_DATA_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVALID_BUTTON_DATA_400)
          break
        case RESPONSE_MESSAGES.WALLET_ID_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.WALLET_ID_NOT_PROVIDED_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: parsedErr.message })
      }
    }
  }
}
