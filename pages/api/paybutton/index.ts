import { NextApiRequest, NextApiResponse } from 'next'
import * as paybuttonsService from 'services/paybuttonsService'
import { validateAddresses } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'


export default async (req: NextApiRequest, res: NextApiResponse) => {
  const values = req.body
  const userId = values.userId
  const addresses = values.addresses
  if (!userId) {
    res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
    return
  }
  if (!addresses) {
    res.status(400).json(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400)
    return
  }
  if (req.method == 'POST') {
    const prefixedAddressList = addresses.trim().split('\n')
    if (validateAddresses(prefixedAddressList)) {
      try {
        const paybutton = await paybuttonsService.createPaybutton(userId, prefixedAddressList)
        res.status(200).json(paybutton);
      }
      catch (err) {
        res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
    else {
        res.status(400).json(RESPONSE_MESSAGES.INVALID_INPUT_400)
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
