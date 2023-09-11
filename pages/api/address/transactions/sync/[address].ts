import { NextApiResponse, NextApiRequest } from 'next'
import { parseAddress } from 'utils/validators'
import { NUMBER_OF_TRANSACTIONS_TO_SYNC_INITIALLY, RESPONSE_MESSAGES } from 'constants/index'
import { syncAndSubscribeAddresses } from 'services/transactionService'
import { upsertAddress } from 'services/addressService'
import Cors from 'cors'
import { runMiddleware } from 'utils/index'

const { ADDRESS_NOT_PROVIDED_400, INVALID_ADDRESS_400 } = RESPONSE_MESSAGES
const cors = Cors({
  methods: ['GET', 'HEAD']
})

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  await runMiddleware(req, res, cors)
  if (req.method === 'GET') {
    try {
      if (req.query.address === '' || req.query.address === undefined) {
        throw new Error(ADDRESS_NOT_PROVIDED_400.message)
      }
      const addressString = parseAddress(req.query.address as string)
      const address = await upsertAddress(addressString)
      const syncedData = await syncAndSubscribeAddresses([address], NUMBER_OF_TRANSACTIONS_TO_SYNC_INITIALLY)
      res.status(200).send(syncedData.syncedTxs)
    } catch (err: any) {
      switch (err.message) {
        case ADDRESS_NOT_PROVIDED_400.message:
          res.status(ADDRESS_NOT_PROVIDED_400.statusCode).json(ADDRESS_NOT_PROVIDED_400)
          break
        case INVALID_ADDRESS_400.message: {
          res.status(INVALID_ADDRESS_400.statusCode).json(INVALID_ADDRESS_400)
          break
        }
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
