import { NextApiResponse, NextApiRequest } from 'next'
import { parseAddress } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'
import { fetchAddressTransactions, syncTransactionsAndPricesForAddress } from 'services/transactionService'
import { upsertAddress, fetchAddressesInList } from 'services/addressService'
import Cors from 'cors'

const { ADDRESS_NOT_PROVIDED_400, INVALID_ADDRESS_400 } = RESPONSE_MESSAGES
const cors = Cors({
  methods: ['GET', 'HEAD']
})

async function runMiddleware (
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
): Promise<any> {
  return await new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result)
      }

      return resolve(result)
    })
  })
}

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  await runMiddleware(req, res, cors)
  if (req.method === 'GET') {
    try {
      if (req.query.address === '' || req.query.address === undefined) {
        throw new Error(ADDRESS_NOT_PROVIDED_400.message)
      }
      let transactions = []
      const address = parseAddress(req.query.address as string)

      const addressInDB = (await fetchAddressesInList([address])).length
      if (addressInDB === 0) {
        void await upsertAddress(address)
        await syncTransactionsAndPricesForAddress(address)
      }
      transactions = await fetchAddressTransactions(address)

      res.status(200).send(transactions)
    } catch (err: any) {
      switch (err.message) {
        case ADDRESS_NOT_PROVIDED_400.message:
          res.status(ADDRESS_NOT_PROVIDED_400.statusCode).json(ADDRESS_NOT_PROVIDED_400)
          break
        case INVALID_ADDRESS_400.message: {
          res.status(INVALID_ADDRESS_400.statusCode).send(INVALID_ADDRESS_400)
          break
        }
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
