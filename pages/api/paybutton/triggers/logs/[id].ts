import { setSession } from 'utils/setSession'
import { RESPONSE_MESSAGES } from 'constants/index'
import { parseError } from 'utils/validators'
import { fetchPaybuttonById } from 'services/paybuttonService'
import { fetchTriggerLogsForPaybutton, TriggerLogActionType } from 'services/triggerService'

export default async function handler (req: any, res: any): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method Not Allowed' })
    return
  }

  await setSession(req, res)
  const userId = req.session.userId
  const paybuttonId = req.query.id as string
  const page = parseInt(req.query.page ?? '0', 10)
  const pageSize = parseInt(req.query.pageSize ?? '10', 10)

  if (Number.isNaN(page) || Number.isNaN(pageSize) || page < 0 || pageSize < 1) {
    res.status(400).json(RESPONSE_MESSAGES.PAGE_SIZE_AND_PAGE_SHOULD_BE_NUMBERS_400)
    return
  }

  const orderBy = (req.query.orderBy as string) ?? 'createdAt'
  const allowedOrderFields = new Set(['createdAt', 'id', 'isError', 'actionType'])
  if (!allowedOrderFields.has(orderBy)) {
    res.status(400).json(RESPONSE_MESSAGES.INVALID_INPUT_400)
    return
  }
  const orderDesc = req.query.orderDesc === 'true'
  const actionType = req.query.actionType as TriggerLogActionType

  try {
    if (userId === null || userId === undefined || userId === '') {
      res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
      return
    }

    const paybutton = await fetchPaybuttonById(paybuttonId)
    if (paybutton.providerUserId !== userId) {
      res.status(400).json(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400)
      return
    }

    const { data, totalCount } = await fetchTriggerLogsForPaybutton({
      paybuttonId,
      page,
      pageSize,
      orderBy,
      orderDesc,
      actionType
    })

    res.status(200).json({ data, totalCount })
  } catch (err: any) {
    const parsedErr = parseError(err)
    switch (parsedErr.message) {
      case RESPONSE_MESSAGES.INVALID_RESOURCE_UPDATE_400.message:
        res.status(400).json(RESPONSE_MESSAGES.INVALID_RESOURCE_UPDATE_400)
        break
      case RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message:
        res.status(400).json(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400)
        break
      case RESPONSE_MESSAGES.NO_BUTTON_FOUND_404.message:
        res.status(404).json(RESPONSE_MESSAGES.NO_BUTTON_FOUND_404)
        break
      default:
        res.status(500).json({ statusCode: 500, message: parsedErr.message })
    }
  }
}
