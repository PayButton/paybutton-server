import { generatePaymentId } from 'services/clientPaymentService'
import { parseAddress, parseCreatePaymentIdPOSTRequest } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'
import { runMiddleware } from 'utils/index'

import Cors from 'cors'

const cors = Cors({
  methods: ['POST']
})

export default async (req: any, res: any): Promise<void> => {
  await runMiddleware(req, res, cors)
  if (req.method === 'POST') {
    try {
      const { amount, fields, address } = parseCreatePaymentIdPOSTRequest(req.body)
      const parsedAddress = parseAddress(address)

      const paymentId = await generatePaymentId(parsedAddress, amount, fields)

      res.status(200).json({ paymentId })
    } catch (error: any) {
      switch (error.message) {
        case RESPONSE_MESSAGES.ADDRESS_NOT_PROVIDED_400.message:
          res.status(RESPONSE_MESSAGES.ADDRESS_NOT_PROVIDED_400.statusCode).json(RESPONSE_MESSAGES.ADDRESS_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.INVALID_ADDRESS_400.message:
          res.status(RESPONSE_MESSAGES.INVALID_ADDRESS_400.statusCode).json(RESPONSE_MESSAGES.INVALID_ADDRESS_400)
          break
        case RESPONSE_MESSAGES.INVALID_FIELDS_FORMAT_400.message:
          res.status(RESPONSE_MESSAGES.INVALID_FIELDS_FORMAT_400.statusCode).json(RESPONSE_MESSAGES.INVALID_FIELDS_FORMAT_400)
          break
        case RESPONSE_MESSAGES.INVALID_FIELD_STRUCTURE_400.message:
          res.status(RESPONSE_MESSAGES.INVALID_FIELD_STRUCTURE_400.statusCode).json(RESPONSE_MESSAGES.INVALID_FIELD_STRUCTURE_400)
          break
        case RESPONSE_MESSAGES.INVALID_AMOUNT_400.message:
          res.status(RESPONSE_MESSAGES.INVALID_AMOUNT_400.statusCode).json(RESPONSE_MESSAGES.INVALID_AMOUNT_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: error.message })
      }
    }
  } else {
    res.status(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED_405.statusCode)
      .json(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED_405)
  }
}
