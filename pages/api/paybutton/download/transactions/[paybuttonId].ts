import {
  RESPONSE_MESSAGES,
  NetworkTickersType,
  NETWORK_IDS,
  SUPPORTED_QUOTES_FROM_ID,
  NETWORK_SLUGS_FROM_IDS
} from 'constants/index'
import { fetchTransactionsByPaybuttonId } from 'services/transactionService'
import { fetchPaybuttonById } from 'services/paybuttonService'
import { isNetworkValid, downloadTxsFile } from 'utils/files'
import { setSession } from 'utils/setSession'
import { getNetworkIdFromSlug } from 'services/networkService'
import { fetchUserProfileFromId } from 'services/userService'

export default async (req: any, res: any): Promise<void> => {
  try {
    if (req.method !== 'GET') {
      throw new Error(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED.message)
    }
    if ((req.query.paybuttonId === undefined)) {
      throw new Error(RESPONSE_MESSAGES.PAYBUTTON_ID_NOT_PROVIDED_400.message)
    }

    await setSession(req, res)

    const userId = req.session.userId
    const user = await fetchUserProfileFromId(userId)
    const paybuttonId = req.query.paybuttonId as string
    const networkTickerReq = req.query.network as string

    const networkTicker = (networkTickerReq !== '' && isNetworkValid(networkTickerReq as NetworkTickersType)) ? networkTickerReq.toUpperCase() as NetworkTickersType : undefined
    let quoteId: number
    if (req.query.currency === undefined || req.query.currency === '' || Number.isNaN(req.query.currency)) {
      quoteId = user.preferredCurrencyId
    } else {
      quoteId = req.query.currency as number
    }
    const quoteSlug = SUPPORTED_QUOTES_FROM_ID[quoteId]
    const paybutton = await fetchPaybuttonById(paybuttonId)
    if (paybutton.providerUserId !== userId) {
      throw new Error(RESPONSE_MESSAGES.RESOURCE_DOES_NOT_BELONG_TO_USER_400.message)
    }
    const userReqTimezone = req.headers.timezone as string
    const userPreferredTimezone = user?.preferredTimezone
    const timezone = userPreferredTimezone !== '' ? userPreferredTimezone : userReqTimezone
    let networkIdArray = Object.values(NETWORK_IDS)
    if (networkTicker !== undefined) {
      const slug =  NETWORK_SLUGS_FROM_IDS[NETWORK_IDS[networkTicker]]
      if (slug === undefined) {
        throw new Error(RESPONSE_MESSAGES.INVALID_NETWORK_SLUG_400.message)
      }
      const networkId = getNetworkIdFromSlug(slug)
      networkIdArray = [networkId]
    };
    const transactions = await fetchTransactionsByPaybuttonId(paybutton.id, networkIdArray)
    res.setHeader('Content-Type', 'text/csv')
    await downloadTxsFile(res, quoteSlug, timezone, transactions)
  } catch (error: any) {
    switch (error.message) {
      case RESPONSE_MESSAGES.PAYBUTTON_ID_NOT_PROVIDED_400.message:
        res.status(RESPONSE_MESSAGES.PAYBUTTON_ID_NOT_PROVIDED_400.statusCode)
          .json(RESPONSE_MESSAGES.PAYBUTTON_ID_NOT_PROVIDED_400)
        break
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
