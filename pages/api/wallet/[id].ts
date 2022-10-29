import { NextApiResponse, NextApiRequest } from 'next/types'
import * as walletService from 'services/walletService'
import { RESPONSE_MESSAGES } from 'constants/index'

export default async (
  req: NextApiRequest,
  res: NextApiResponse
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
  }
}
