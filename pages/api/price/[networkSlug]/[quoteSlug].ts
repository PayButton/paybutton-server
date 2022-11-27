import { NextApiResponse, NextApiRequest } from 'next/types'
import { getNetworkFromSlug } from 'services/networkService'
import { getCurrentPricesForNetworkId, QuoteValues } from 'services/priceService'
import { parseError } from 'utils/validators'
import { RESPONSE_MESSAGES, SUPPORTED_QUOTES } from 'constants/index'

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    const networkSlug = req.query.networkSlug as string
    const quoteSlug = req.query.quoteSlug as string
    try {
      if (quoteSlug === '' || quoteSlug === undefined) {
        throw new Error(RESPONSE_MESSAGES.QUOTE_SLUG_NOT_PROVIDED_400.message)
      }
      if (networkSlug === '' || networkSlug === undefined) {
        throw new Error(RESPONSE_MESSAGES.NETWORK_SLUG_NOT_PROVIDED_400.message)
      }
      if (!SUPPORTED_QUOTES.includes(quoteSlug)) {
        throw new Error(RESPONSE_MESSAGES.INVALID_QUOTE_SLUG_400.message)
      }
      const networkId = (await getNetworkFromSlug(networkSlug)).id
      const response = await getCurrentPricesForNetworkId(networkId)
      res.status(200).json(response[quoteSlug as keyof QuoteValues])
    } catch (err: any) {
      const parsedError = parseError(err)
      switch (parsedError.message) {
        case RESPONSE_MESSAGES.INVALID_QUOTE_SLUG_400.message:
          res.status(RESPONSE_MESSAGES.INVALID_QUOTE_SLUG_400.statusCode).json(RESPONSE_MESSAGES.INVALID_QUOTE_SLUG_400)
          break
        case RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.message:
          res.status(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.statusCode).json(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400)
          break
        case RESPONSE_MESSAGES.QUOTE_SLUG_NOT_PROVIDED_400.message:
          res.status(RESPONSE_MESSAGES.QUOTE_SLUG_NOT_PROVIDED_400.statusCode).json(RESPONSE_MESSAGES.QUOTE_SLUG_NOT_PROVIDED_400)
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
