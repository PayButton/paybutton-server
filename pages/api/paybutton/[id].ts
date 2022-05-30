import { NextApiResponse, NextApiRequest } from "next/types"
import * as paybuttonsService from 'services/paybuttonsService'
import { RESPONSE_MESSAGES } from 'constants/index'


export default async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  if (req.method == 'GET') {
    const payButtonId = req.query.id as string
    try {
      const paybutton = await paybuttonsService.fetchPaybuttonById(payButtonId)
      if (!paybutton) throw new Error(RESPONSE_MESSAGES.NOT_FOUND_404.message)
      res.status(200).json(paybutton);
    }
    catch(err) {
      switch (err.message) {
        case RESPONSE_MESSAGES.NOT_FOUND_404.message:
          res.status(404).json(RESPONSE_MESSAGES.NOT_FOUND_404)
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
