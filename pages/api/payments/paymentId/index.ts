import { Decimal } from '@prisma/client/runtime/library'
import { generatePaymentId } from 'services/transactionService'
import { parseAddress, parseCreatePaymentIdPOSTRequest } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'POST') {
    try {
      const values = parseCreatePaymentIdPOSTRequest(req.body)
      const address = parseAddress(values.address)
      const amount = values.amount as Decimal | undefined

      const paymentId = await generatePaymentId(address, amount)

      res.status(200).json({ paymentId })
    } catch (error: any) {
      switch (error.message) {
        case RESPONSE_MESSAGES.ADDRESS_NOT_PROVIDED_400.message:
          res.status(RESPONSE_MESSAGES.ADDRESS_NOT_PROVIDED_400.statusCode).json(RESPONSE_MESSAGES.ADDRESS_NOT_PROVIDED_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: error.message })
      }
    }
  } else {
    res.status(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED.statusCode)
      .json(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED)
  }
}
