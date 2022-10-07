import * as walletService from 'services/walletService'
import { parseError, parseWalletPOSTRequest } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'

export default async (req: any, res: any): Promise<void> => {
  if (req.method === 'POST') {
    const values = req.body
    try {
      const createWalletInput = parseWalletPOSTRequest(values)
      const wallet = await walletService.createWallet(createWalletInput)
      res.status(200).json(wallet)
    } catch (err: any) {
      const parsedErr = parseError(err)
      switch (parsedErr.message) {
        case RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.ADDRESS_ALREADY_BELONGS_TO_WALLET_400.message:
          res.status(400).json(RESPONSE_MESSAGES.ADDRESS_ALREADY_BELONGS_TO_WALLET_400)
          break
        case RESPONSE_MESSAGES.PAYBUTTON_ALREADY_BELONGS_TO_WALLET_400.message:
          res.status(400).json(RESPONSE_MESSAGES.PAYBUTTON_ALREADY_BELONGS_TO_WALLET_400)
          break
        case RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.WALLET_NAME_ALREADY_EXISTS_400.message:
          res.status(400).json(RESPONSE_MESSAGES.WALLET_NAME_ALREADY_EXISTS_400)
          break
        case RESPONSE_MESSAGES.BUTTON_IDS_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.BUTTON_IDS_NOT_PROVIDED_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: parsedErr.message })
      }
    }
  }
}
