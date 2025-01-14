import { NextApiResponse, NextApiRequest } from 'next'
import { parseAddress } from 'utils/validators'
import { DEFAULT_TX_PAGE_SIZE, RESPONSE_MESSAGES, TX_PAGE_SIZE_LIMIT } from 'constants/index'
import { fetchPaginatedAddressTransactions } from 'services/transactionService'
import { upsertAddress } from 'services/addressService'
import Cors from 'cors'
import { runMiddleware } from 'utils/index'
import { MultiBlockchainClient } from 'services/chronikService'

const { ADDRESS_NOT_PROVIDED_400, INVALID_ADDRESS_400, NO_ADDRESS_FOUND_404, STARTED_SYNC_200 } = RESPONSE_MESSAGES
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

      const page = (req.query.page === '' || req.query.page === undefined) ? 0 : Number(req.query.page)
      const pageSize = (req.query.pageSize === '' || req.query.pageSize === undefined) ? DEFAULT_TX_PAGE_SIZE : Number(req.query.pageSize)
      const orderBy = (req.query.orderBy === '' || req.query.orderBy === undefined) ? undefined : req.query.orderBy as string
      const orderDesc: boolean = !!(req.query.orderDesc === '' || req.query.orderDesc === undefined || req.query.orderDesc === 'true')
      if (isNaN(page) || isNaN(pageSize)) {
        throw new Error(RESPONSE_MESSAGES.PAGE_SIZE_AND_PAGE_SHOULD_BE_NUMBERS_400.message)
      }
      if (pageSize > TX_PAGE_SIZE_LIMIT) {
        throw new Error(RESPONSE_MESSAGES.PAGE_SIZE_LIMIT_EXCEEDED_400.message)
      }

      const address = parseAddress(req.query.address as string)

      // this flag ?serverOnly=1 tells us to only retrieve what we have in the database
      const serverOnly = req.query.serverOnly === '1'

      try {
        const transactions = await fetchPaginatedAddressTransactions(address, page, pageSize, orderBy, orderDesc)
        res.status(200).send(transactions)
      } catch (err: any) {
        switch (err.message) {
          case NO_ADDRESS_FOUND_404.message: {
            if (serverOnly) throw new Error(NO_ADDRESS_FOUND_404.message)
            const addressObject = await upsertAddress(address)
            await MultiBlockchainClient.getInstance().syncAndSubscribeAddresses([addressObject])
            res.status(STARTED_SYNC_200.statusCode).json(STARTED_SYNC_200)
            break
          }
          default:
            throw err
        }
      }
    } catch (err: any) {
      switch (err.message) {
        case ADDRESS_NOT_PROVIDED_400.message:
          res.status(ADDRESS_NOT_PROVIDED_400.statusCode).json(ADDRESS_NOT_PROVIDED_400)
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
