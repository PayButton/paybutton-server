import { setSession } from 'utils/setSession'
import { RESPONSE_MESSAGES } from 'constants/index'
import { CreateInvoiceParams, UpdateInvoiceParams, createInvoice, updateInvoice } from 'services/invoiceService'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res, true)
  const session = req.session
  if (req.method === 'POST') {
    try {
      const createInvoiceParams: CreateInvoiceParams = {
        ...req.body,
        userId: session.userId
      }
      const invoice = await createInvoice(createInvoiceParams)
      res.status(200).json({
        invoice
      })
    } catch (err: any) {
      switch (err.message) {
        case RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  } else if (req.method === 'PUT') {
    try {
      const updateInvoiceParams: UpdateInvoiceParams = {
        ...req.body
      }
      const invoiceId = req.query.invoiceId as string
      const invoice = await updateInvoice(session.userId,
        invoiceId, updateInvoiceParams)
      res.status(200).json({
        invoice
      })
    } catch (err: any) {
      switch (err.message) {
        case RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
