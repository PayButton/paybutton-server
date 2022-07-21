import { NextApiResponse, NextApiRequest } from 'next'
import { parseAddress } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'
import { fetchPaybuttonAddressBySubstring } from 'services/paybuttonAddressesService'
import Cors from 'cors'

const { ADDRESS_NOT_PROVIDED_400 } = RESPONSE_MESSAGES
const cors = Cors({
  methods: ['GET', 'HEAD'],
})

function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result)
      }

      return resolve(result)
    })
  })
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
    await runMiddleware(req, res, cors)
  if (req.method === 'GET') {
    try {
      if (req.query.address === '' || req.query.address === undefined) {
        throw new Error(ADDRESS_NOT_PROVIDED_400.message)
      }
      const address = parseAddress(req.query.address as string)
      const paybuttonAddress = await fetchPaybuttonAddressBySubstring(address)
      res.status(200).send(paybuttonAddress.receivedTransactions)
    } catch (err: any) {
      switch (err.message) {
        case ADDRESS_NOT_PROVIDED_400.message:
          res.status(ADDRESS_NOT_PROVIDED_400.statusCode).json(ADDRESS_NOT_PROVIDED_400)
          break
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
