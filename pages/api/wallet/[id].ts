import * as walletService from 'services/walletService'
import { parseWalletPATCHRequest, parseError } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'
import { setSession } from 'utils/setSession'

export default async (
  req: any,
  res: any
): Promise<void> => {
  const walletId = req.query.id as string
  if (req.method === 'GET') {
    try {
      const wallet = await walletService.fetchWalletById(walletId)
      if (wallet == null) throw new Error(RESPONSE_MESSAGES.NO_WALLET_FOUND_404.message)
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
    await setSession(req, res)
    try {
      const params = req.body
      params.userId = req.session.userId
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
        case RESPONSE_MESSAGES.DEFAULT_BCH_WALLET_MUST_HAVE_SOME_BCH_ADDRESS_400.message:
          res.status(400).json(RESPONSE_MESSAGES.DEFAULT_BCH_WALLET_MUST_HAVE_SOME_BCH_ADDRESS_400)
          break
        case RESPONSE_MESSAGES.DEFAULT_XEC_WALLET_MUST_HAVE_SOME_XEC_ADDRESS_400.message:
          res.status(400).json(RESPONSE_MESSAGES.DEFAULT_XEC_WALLET_MUST_HAVE_SOME_XEC_ADDRESS_400)
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
  }
}
