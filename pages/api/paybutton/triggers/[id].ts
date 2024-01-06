import { parseError, parsePaybuttonTriggerPOSTRequest, PaybuttonTriggerPOSTParameters } from 'utils/validators'
import { setSession } from 'utils/setSession'
import { RESPONSE_MESSAGES } from 'constants/index'
import { createTrigger, deleteTrigger, fetchTriggersForPaybutton, updateTrigger } from 'services/triggerService'
import { PaybuttonTrigger } from '@prisma/client'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'GET') {
    await setSession(req, res)
    const userId = req.session.userId
    const paybuttonId = req.query.id as string
    try {
      const triggers = await fetchTriggersForPaybutton(paybuttonId, userId)
      res.status(200).json(triggers)
    } catch (err: any) {
      const parsedErr = parseError(err)
      switch (parsedErr.message) {
        case RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.INVALID_URL_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVALID_URL_400)
          break
        case RESPONSE_MESSAGES.INVALID_DATA_JSON_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVALID_DATA_JSON_400)
          break
        case RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message:
          res.status(400).json(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: parsedErr.message })
      }
    }
  } else if (req.method === 'POST') {
    await setSession(req, res)
    const values = req.body as PaybuttonTriggerPOSTParameters
    values.userId = req.session.userId
    const paybuttonId = req.query.id as string
    try {
      const createTriggerInput = parsePaybuttonTriggerPOSTRequest(values)
      let trigger: PaybuttonTrigger
      if (values.currentTriggerId !== undefined) {
        const updateTriggerInput = {
          ...createTriggerInput,
          triggerId: values.currentTriggerId
        }
        trigger = await updateTrigger(paybuttonId, updateTriggerInput)
      } else {
        trigger = await createTrigger(paybuttonId, createTriggerInput)
      }
      res.status(200).json(trigger)
    } catch (err: any) {
      const parsedErr = parseError(err)
      switch (parsedErr.message) {
        case RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.INVALID_URL_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVALID_URL_400)
          break
        case RESPONSE_MESSAGES.LIMIT_TRIGGERS_PER_BUTTON_400.message:
          res.status(400).json(RESPONSE_MESSAGES.LIMIT_TRIGGERS_PER_BUTTON_400)
          break
        case RESPONSE_MESSAGES.INVALID_DATA_JSON_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVALID_DATA_JSON_400)
          break
        case RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message:
          res.status(400).json(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: parsedErr.message })
      }
    }
  } else if (req.method === 'DELETE') {
    await setSession(req, res)
    const values = req.body as PaybuttonTriggerPOSTParameters
    values.userId = req.session.userId
    const paybuttonId = req.query.id as string
    try {
      const trigger = await deleteTrigger(paybuttonId, values)
      res.status(200).json(trigger)
    } catch (err: any) {
      const parsedErr = parseError(err)
      switch (parsedErr.message) {
        case RESPONSE_MESSAGES.INVALID_RESOURCE_UPDATE_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVALID_RESOURCE_UPDATE_400)
          break
        case RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message:
          res.status(400).json(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: parsedErr.message })
      }
    }
  }
}
