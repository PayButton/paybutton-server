import { fetchTxCountByPaybuttonId } from 'services/transactionService'
import { RESPONSE_MESSAGES } from 'constants/index'
import { fetchPaybuttonById } from 'services/paybuttonService'
import { setSession } from 'utils/setSession'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    try {
      await setSession(req, res)
      const paybuttonId = req.query.id as string
      const userId = req.session.userId
      const paybutton = await fetchPaybuttonById(paybuttonId)
      if (paybutton.providerUserId !== userId) {
        throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
      }
      const count = await fetchTxCountByPaybuttonId(paybuttonId)
      res.status(200).send(count)
    } catch (err: any) {
      switch (err.message) {
        case RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message:
          res.status(400).json(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
