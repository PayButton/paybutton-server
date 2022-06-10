import { NextApiRequest, NextApiResponse } from 'next'
import * as paybuttonsService from 'services/paybuttonsService'
import { parseAddresses, parseButtonData, parseErrors } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'

interface POSTParameters {
  userId?: string
  name?: string
  buttonData?: string
  addresses?: string
}

const parsePOSTRequest = function (params: POSTParameters): paybuttonsService.CreatePaybuttonInput {
  if (params.userId === '' || params.userId === undefined) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  if (params.name === '' || params.name === undefined) throw new Error(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
  const parsedAddresses = parseAddresses(params.addresses)
  const parsedButtonData = parseButtonData(params.buttonData)
  return {
    userId: params.userId,
    name: params.name,
    buttonData: parsedButtonData,
    prefixedAddressList: parsedAddresses
  }
}

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const values = req.body
  const userId: string | undefined = values.userId
  if (req.method === 'POST') {
    try {
      const createPaybuttonInput = parsePOSTRequest(values)
      const paybutton = await paybuttonsService.createPaybutton(createPaybuttonInput)
      res.status(200).json(paybutton)
    } catch (err: any) {
      const parsedErr = parseErrors(err)
      switch (parsedErr.message) {
        case RESPONSE_MESSAGES.INVALID_INPUT_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVALID_INPUT_400)
          break
        case RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.NAME_ALREADY_EXISTS_400.message:
          res.status(400).json(RESPONSE_MESSAGES.NAME_ALREADY_EXISTS_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: parsedErr.message })
      }
    }
  } else if (req.method === 'GET') {
    try {
      if (userId === '' || userId === undefined) throw new Error(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
      const paybuttonList = await paybuttonsService.fetchPaybuttonArrayByUserId(userId)
      res.status(200).json(paybuttonList)
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
