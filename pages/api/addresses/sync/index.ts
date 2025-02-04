import { NextApiResponse, NextApiRequest } from 'next'
import { RESPONSE_MESSAGES } from 'constants/index'
import { multiBlockchainClient } from 'services/chronikService'
import { fetchAddressesArray } from 'services/addressService'
import Cors from 'cors'
import { runMiddleware } from 'utils/index'

const { ADDRESSES_NOT_PROVIDED_400, INVALID_ADDRESS_400, NO_ADDRESS_FOUND_404, STARTED_SYNC_200 } = RESPONSE_MESSAGES
const cors = Cors({
  methods: ['GET', 'HEAD']
})

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  await runMiddleware(req, res, cors)
  if (req.method === 'POST') {
    try {
      if (req.body.addresses === '' || req.body.addresses === undefined || req.body.addresses.length === 0) {
        throw new Error(ADDRESSES_NOT_PROVIDED_400.message)
      }
      const addresses = req.query.addresses as string[]
      const addressList = await fetchAddressesArray(addresses)
      await multiBlockchainClient.syncAndSubscribeAddresses(addressList)
      res.status(STARTED_SYNC_200.statusCode).json(STARTED_SYNC_200)
    } catch (err: any) {
      switch (err.message) {
        case ADDRESSES_NOT_PROVIDED_400.message:
          res.status(ADDRESSES_NOT_PROVIDED_400.statusCode).json(ADDRESSES_NOT_PROVIDED_400)
          break
        case INVALID_ADDRESS_400.message: {
          res.status(INVALID_ADDRESS_400.statusCode).json(INVALID_ADDRESS_400)
          break
        }
        case NO_ADDRESS_FOUND_404.message: {
          res.status(NO_ADDRESS_FOUND_404.statusCode).json(NO_ADDRESS_FOUND_404)
          break
        }
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
