import { NextApiRequest, NextApiResponse } from 'next'
import * as paybuttonsService from 'services/paybuttonsService'
import { validateAddresses } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'


export default async (req: NextApiRequest, res: NextApiResponse) => {
  const values = req.body
  const userId = values.userId
  if (req.method == 'POST') {
    const addresses = values.addresses
    const prefixedAddressList = addresses.trim().split('\n')
    try {
      if (!userId) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
      validateAddresses(prefixedAddressList)
      const paybutton = await paybuttonsService.createPaybutton(userId, prefixedAddressList)
      res.status(200).json(paybutton);
    }
    catch (err: any) {
      switch (err.message) 
      {
        case RESPONSE_MESSAGES.INVALID_INPUT_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVALID_INPUT_400)
        case RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400)
        case RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
  else if (req.method == 'GET') {
    try {
      const paybuttonList = await paybuttonsService.fetchPaybuttonArrayByUserId(userId)
      res.status(200).json(paybuttonList);
    }
    catch (err) {
      res.status(500).json({ statusCode: 500, message: err.message })
    }
  }
}
