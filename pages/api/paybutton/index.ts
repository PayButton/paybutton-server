import { NextApiRequest, NextApiResponse } from 'next'
import * as paybuttonsService from 'services/paybuttonsService'
import { validateAddresses } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'


export default (req: NextApiRequest, res: NextApiResponse) => {
  const values = req.body
  const userId = values.userId
  if (!userId) {
    res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
    return
  }
  if (req.method == 'POST') {
    const prefixedAddressList = values.addresses.trim().split('\n')
    if (validateAddresses(prefixedAddressList)) {
      paybuttonsService.createPaybutton(userId, prefixedAddressList).then(
        function (paybutton) {
          res.status(200).json(paybutton);
        }).catch(function(err) {
          res.status(500).json({ statusCode: 500, message: err.message })
        })
    }
    else {
        res.status(400).json(RESPONSE_MESSAGES.INVALID_INPUT_400)
    }
  }
  else if (req.method == 'GET') {
    paybuttonsService.fetchPaybuttonListByUserId(userId).then(
     function (paybuttonList) {
       res.status(200).json(paybuttonList);
     }).catch(function(err) {
       res.status(500).json({ statusCode: 500, message: err.message })
     })
  }
}
