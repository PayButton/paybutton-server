import * as invoiceService from 'services/invoiceService'
import { RESPONSE_MESSAGES } from 'constants/index'
import { setSession } from 'utils/setSession'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res)
  const userId = req.session.userId
  const transactionId = req.query.transactionId as string
  if (req.method === 'GET') {
    try {
      const invoice = await invoiceService.getInvoiceByTransactionId(transactionId, userId)
      res.status(200).json(invoice)
    } catch (err: any) {
      switch (err.message) {
        case RESPONSE_MESSAGES.NO_INVOICE_FOUND_404.message:
          res.status(404).json(RESPONSE_MESSAGES.NO_INVOICE_FOUND_404)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
