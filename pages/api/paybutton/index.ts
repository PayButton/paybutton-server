import { parseAddresses } from 'utils/validators'
import { NextApiRequest, NextApiResponse } from 'next'
import * as paybuttonsService from 'services/paybuttonsService'
import { RESPONSE_MESSAGES } from 'constants/index'

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'POST') {
    const body = req.body
    const userId: string | undefined = body.userId
    try {
      if (userId === '' || userId === undefined) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
      const parsedAddresses = parseAddresses(body.addresses)
      const paybutton = await paybuttonsService.createPaybutton(userId, parsedAddresses)
      res.status(200).json(paybutton)
    } catch (err: any) {
      switch (err.message) {
        case RESPONSE_MESSAGES.INVALID_INPUT_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVALID_INPUT_400)
          break
        case RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
