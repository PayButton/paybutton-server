import * as invoiceService from 'services/invoiceService'
import { setSession } from 'utils/setSession'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res)
  const userId = req.session.userId
  if (req.method === 'GET') {
    try {
      const invoiceNumber = await invoiceService.getNewInvoiceNumber(userId)
      res.status(200).json({ invoiceNumber })
    } catch (err: any) {
      res.status(500).json({ statusCode: 500, message: err.message })
    }
  }
}
