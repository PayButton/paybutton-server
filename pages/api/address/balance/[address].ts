import { NextApiResponse, NextApiRequest } from 'next'
import { RESPONSE_MESSAGES } from 'constants/index'
import { parseAddress } from 'utils/validators'
import Cors from 'cors'
import { runMiddleware, satoshisToUnit } from 'utils/index'
import xecaddr from 'xecaddrjs'
import { Prisma } from '@prisma/client'
import { multiBlockchainClient } from 'services/chronikService'

const { ADDRESS_NOT_PROVIDED_400 } = RESPONSE_MESSAGES
const cors = Cors({
  methods: ['GET', 'HEAD']
})

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  await runMiddleware(req, res, cors)
  if (req.method === 'GET') {
    try {
      const address = parseAddress(req.query.address as string)
      const response = await multiBlockchainClient.getBalance(address)
      const balance = await satoshisToUnit(new Prisma.Decimal(response), xecaddr.detectAddressFormat(address))
      res.status(200).send(balance)
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
