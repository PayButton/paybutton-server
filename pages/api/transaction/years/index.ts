import { fetchDistinctTransactionYearsByUser } from 'services/transactionService'
import { setSession } from 'utils/setSession'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    try {
      await setSession(req, res)
      const userId = req.session.userId
      const years = await fetchDistinctTransactionYearsByUser(userId)
      res.status(200).json({ years })
    } catch (err: any) {
      res.status(500).json({ statusCode: 500, message: err.message })
    }
  }
}
