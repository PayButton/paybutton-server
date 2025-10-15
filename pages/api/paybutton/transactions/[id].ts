import { RESPONSE_MESSAGES, TX_PAGE_SIZE_LIMIT } from 'constants/index'
import { fetchTransactionsByPaybuttonIdWithPagination } from 'services/transactionService'
import * as paybuttonService from 'services/paybuttonService'
import { setSession } from 'utils/setSession'
import { parseError } from 'utils/validators'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    await setSession(req, res)
    const userId = req.session.userId
    const paybuttonId = req.query.id as string
    const page = (req.query.page === '' || req.query.page === undefined) ? 0 : Number(req.query.page)
    const pageSize = (req.query.pageSize === '' || req.query.pageSize === undefined) ? DEFAULT_TX_PAGE_SIZE : Number(req.query.pageSize)
    const orderBy = (req.query.orderBy === '' || req.query.orderBy === undefined) ? undefined : req.query.orderBy as string
    const orderDesc: boolean = !!(req.query.orderDesc === '' || req.query.orderDesc === undefined || req.query.orderDesc === 'true')

    if (isNaN(page) || isNaN(pageSize)) {
      throw new Error(RESPONSE_MESSAGES.PAGE_SIZE_AND_PAGE_SHOULD_BE_NUMBERS_400.message)
    }
    if (pageSize > TX_PAGE_SIZE_LIMIT) {
      throw new Error(RESPONSE_MESSAGES.PAGE_SIZE_LIMIT_EXCEEDED_400.message)
    }

    try {
      const paybutton = await paybuttonService.fetchPaybuttonById(paybuttonId)
      if (paybutton.providerUserId !== userId) {
        throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
      }

      const transactions = await fetchTransactionsByPaybuttonIdWithPagination(paybuttonId, page, pageSize, orderDesc, orderBy)

      res.status(200).json({ transactions })
    } catch (err: any) {
      const parsedError = parseError(err)
      if (parsedError.message === RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404.message) {
        res.status(RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404.statusCode)
          .json(RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404)
      } else if (parsedError.message === RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message) {
        res.status(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.statusCode)
          .json(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400)
      } else {
        res.status(500).json({ statusCode: 500, message: parsedError.message })
      }
    }
  } else {
    res.status(405).json(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED_405)
  }
}
