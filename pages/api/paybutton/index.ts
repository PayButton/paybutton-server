import * as paybuttonsService from 'services/paybuttonsService'
import { parseError, parsePaybuttonPOSTRequest } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'

import { verifySession } from 'supertokens-node/recipe/session/framework/express'
import { superTokensNextWrapper } from 'supertokens-node/nextjs'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'POST') {
    const values = req.body

    await superTokensNextWrapper(
      async (next) => await verifySession()(req, res, next),
      req,
      res
    )
    const userId = req.session.userId

    try {
      const createPaybuttonInput = parsePaybuttonPOSTRequest(values, userId)
      const paybutton = await paybuttonsService.createPaybutton(createPaybuttonInput)
      res.status(200).json(paybutton)
    } catch (err: any) {
      const parsedErr = parseError(err)
      switch (parsedErr.message) {
        case RESPONSE_MESSAGES.INVALID_INPUT_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVALID_INPUT_400)
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
        case RESPONSE_MESSAGES.NAME_ALREADY_EXISTS_400.message:
          res.status(400).json(RESPONSE_MESSAGES.NAME_ALREADY_EXISTS_400)
          break
        case RESPONSE_MESSAGES.INVALID_BUTTON_DATA_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVALID_BUTTON_DATA_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: parsedErr.message })
      }
    }
  }
}
