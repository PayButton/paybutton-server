import * as walletService from 'services/walletService'
import { parseWalletPATCHRequest, parseError } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'
import { setSession } from 'utils/setSession'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res)
  const userId = req.session.userId
  const walletId = req.query.id as string
  if (req.method === 'GET') {
    try {
      const wallet = await walletService.fetchWalletById(walletId)
      res.status(200).json(wallet)
    } catch (err: any) {
      switch (err.message) {
        case RESPONSE_MESSAGES.NO_WALLET_FOUND_404.message:
          res.status(404).json(RESPONSE_MESSAGES.NO_WALLET_FOUND_404)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  } else if (req.method === 'PATCH') {
    try {
      const params = req.body
      params.userId = userId
      const updateWalletInput = parseWalletPATCHRequest(params)
      const wallet = await walletService.updateWallet(Number(walletId), updateWalletInput)
      res.status(200).json(wallet)
    } catch (err: any) {
      const parsedError = parseError(err)
      switch (parsedError.message) {
        case RESPONSE_MESSAGES.NO_USER_PROFILE_FOUND_ON_WALLET_404.message:
          res.status(404).json(RESPONSE_MESSAGES.NO_USER_PROFILE_FOUND_ON_WALLET_404)
          break
        case RESPONSE_MESSAGES.NO_WALLET_FOUND_404.message:
          res.status(404).json(RESPONSE_MESSAGES.NO_WALLET_FOUND_404)
          break
        case RESPONSE_MESSAGES.INVALID_NETWORK_ID_400.message:
          res.status(400).json(RESPONSE_MESSAGES.INVALID_NETWORK_ID_400)
          break
        case RESPONSE_MESSAGES.PAYBUTTON_ALREADY_BELONGS_TO_WALLET_400.message:
          res.status(400).json(RESPONSE_MESSAGES.PAYBUTTON_ALREADY_BELONGS_TO_WALLET_400)
          break
        case RESPONSE_MESSAGES.ADDRESS_ALREADY_BELONGS_TO_WALLET_400.message:
          res.status(400).json(RESPONSE_MESSAGES.ADDRESS_ALREADY_BELONGS_TO_WALLET_400)
          break
        case RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.BUTTON_IDS_NOT_PROVIDED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.BUTTON_IDS_NOT_PROVIDED_400)
          break
        case RESPONSE_MESSAGES.WALLET_NAME_ALREADY_EXISTS_400.message:
          res.status(400).json(RESPONSE_MESSAGES.WALLET_NAME_ALREADY_EXISTS_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  } else if (req.method === 'DELETE') {
    try {
      const deletedWallet = await walletService.deleteWallet({ walletId, userId })
      res.status(200).json(deletedWallet)
    } catch (err: any) {
      const parsedError = parseError(err)
      switch (parsedError.message) {
        case RESPONSE_MESSAGES.NO_WALLET_FOUND_404.message:
          res.status(404).json(RESPONSE_MESSAGES.NO_WALLET_FOUND_404)
          break
        case RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message:
          res.status(400).json(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400)
          break
        case RESPONSE_MESSAGES.USER_PROFILE_NOT_FOUND_400.message:
          res.status(400).json(RESPONSE_MESSAGES.USER_PROFILE_NOT_FOUND_400)
          break
        case RESPONSE_MESSAGES.DEFAULT_WALLET_CANNOT_BE_DELETED_400.message:
          res.status(400).json(RESPONSE_MESSAGES.DEFAULT_WALLET_CANNOT_BE_DELETED_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: parsedError.message })
      }
    }
  }
}
