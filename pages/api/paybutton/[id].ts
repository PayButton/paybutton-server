import { NextApiResponse, NextApiRequest } from "next/types"
import * as paybuttonsService from 'services/paybuttonsService'
import { REPONSE_MESSAGES } from 'constants/index'


export default (
    req: NextApiRequest,
    res: NextApiResponse
) => {
  if (req.method == 'GET') {
    const payButtonId = req.query.id as string
    paybuttonsService.fetchPaybuttonById(payButtonId).then(
      function (paybutton) {
        if (!paybutton) {
          res.status(404).json(REPONSE_MESSAGES.NOT_FOUND_404);
        }
        else {
          res.status(200).json(paybutton);
        }
      }).catch(function(err) {
        res.status(500).json({ statusCode: 500, message: err.message })
      })
  }
}
