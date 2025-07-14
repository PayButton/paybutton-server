import { generatePaymentId } from 'services/transactionService'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    const address = req.query.address as string
    const paymentId = await generatePaymentId(address)

    res.status(200).json({ paymentId })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
