import { NextApiResponse, NextApiRequest } from 'next'
import { getBCHBalance } from 'services/bchdService'
import { RESPONSE_MESSAGES } from 'constants/index'
import { parseAddress } from 'utils/validators'
import Cors from 'cors'

const { ADDRESS_NOT_PROVIDED_400 } = RESPONSE_MESSAGES
const cors = Cors({
  methods: ['GET', 'HEAD']
})

async function runMiddleware (
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
): Promise<void> {
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
      const address = parseAddress(req.query.address as string)
      const response = await getBCHBalance(address)
      res.status(200).send(response)
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
