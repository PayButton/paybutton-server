import { NextApiRequest, NextApiResponse } from 'next'
import * as paybuttonsService from 'services/paybuttonsService'
import { parseAddresses } from 'utils/validators'
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
  } else if (req.method === 'GET') {
    const query = req.query
    const userId: string | string[] | undefined = query.userId
    try {
      if (userId === '' || userId === undefined) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
      if (Array.isArray(userId)) throw new Error(RESPONSE_MESSAGES.MULTIPLE_USER_IDS_PROVIDED_400.message)
      const paybuttonList = await paybuttonsService.fetchPaybuttonArrayByUserId(userId)
      res.status(200).json(paybuttonList)
    } catch (err: any) {
      switch (err.message) {
        case RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.MULTIPLE_USER_IDS_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.MULTIPLE_USER_IDS_PROVIDED_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
