import {
  RESPONSE_MESSAGES,
  SUPPORTED_QUOTES_FROM_ID,
  NetworkTickersType,
  NETWORK_IDS,
  NETWORK_TICKERS
} from 'constants/index'
import { downloadTxsFile, isNetworkValid } from 'utils/files'
import { setSession } from 'utils/setSession'
import { fetchUserProfileFromId } from 'services/userService'
import { fetchAllPaymentsByUserId } from 'services/transactionService'

export default async (req: any, res: any): Promise<void> => {
  try {
    if (req.method !== 'GET') {
      throw new Error(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED.message)
    }

    await setSession(req, res)

    const userId = req.session.userId
    const user = await fetchUserProfileFromId(userId)

    let quoteId: number
    if (req.query.currency === undefined || req.query.currency === '' || Number.isNaN(req.query.currency)) {
      quoteId = user.preferredCurrencyId
    } else {
      quoteId = req.query.currency as number
    }
    const quoteSlug = SUPPORTED_QUOTES_FROM_ID[quoteId]
    const userReqTimezone = req.headers.timezone as string
    const userPreferredTimezone = user?.preferredTimezone
    const timezone = userPreferredTimezone !== '' ? userPreferredTimezone : userReqTimezone
    const networkTickerReq = req.query.network as string

    const networkTicker = (networkTickerReq !== '' && isNetworkValid(networkTickerReq as NetworkTickersType)) ? networkTickerReq.toUpperCase() as NetworkTickersType : undefined
    res.setHeader('Content-Type', 'text/csv')
    let networkIdArray = Object.values(NETWORK_IDS)
    if (networkTicker !== undefined) {
      if (!Object.values(NETWORK_TICKERS).includes(networkTicker)) {
        throw new Error(RESPONSE_MESSAGES.INVALID_NETWORK_TICKER_400.message)
      }
      const networkId = NETWORK_IDS[networkTicker]
      networkIdArray = [networkId]
    };
    const transactions = await fetchAllPaymentsByUserId(userId, networkIdArray)
    await downloadTxsFile(res, quoteSlug, timezone, transactions)
  } catch (error: any) {
    switch (error.message) {
      case RESPONSE_MESSAGES.METHOD_NOT_ALLOWED.message:
        res.status(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED.statusCode)
          .json(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED)
        break
      case RESPONSE_MESSAGES.MISSING_PRICE_FOR_TRANSACTION_400.message:
        res.status(RESPONSE_MESSAGES.MISSING_PRICE_FOR_TRANSACTION_400.statusCode)
          .json(RESPONSE_MESSAGES.MISSING_PRICE_FOR_TRANSACTION_400)
        break
      default:
        res.status(500).json({ message: error.message })
    }
  }
}
