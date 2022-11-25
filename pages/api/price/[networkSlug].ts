import { NextApiResponse, NextApiRequest } from 'next/types'
import { getNetworkFromSlug } from 'services/networkService'
import { getCurrentPricesForNetworkId, QuoteValues } from 'services/priceService'
import { parseError } from 'utils/validators'
import { RESPONSE_MESSAGES, DEFAULT_QUOTE_SLUG } from 'constants/index'

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    const networkSlug = req.query.networkSlug as string
    try {
      if (networkSlug === '' || networkSlug === undefined) {
        throw new Error(RESPONSE_MESSAGES.NETWORK_SLUG_NOT_PROVIDED_400.message)
      }
      const networkId = (await getNetworkFromSlug(networkSlug)).id
      const response = await getCurrentPricesForNetworkId(networkId)
      res.status(200).json(response[DEFAULT_QUOTE_SLUG as keyof QuoteValues])
    } catch (err: any) {
      const parsedError = parseError(err)
      switch (parsedError.message) {
        case RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.message:
          res.status(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.statusCode).json(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400)
          break
        case RESPONSE_MESSAGES.NETWORK_SLUG_NOT_PROVIDED_400.message:
          res.status(RESPONSE_MESSAGES.NETWORK_SLUG_NOT_PROVIDED_400.statusCode).json(RESPONSE_MESSAGES.NETWORK_SLUG_NOT_PROVIDED_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
