import { NextApiRequest, NextApiResponse } from 'next'
import { getSubbedAddresses } from 'services/chronikService'

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    try {
      if (req.query.secret !== process.env.WS_AUTH_KEY) {
        throw new Error('unauthorised')
      }
      res.status(200).json(getSubbedAddresses())
    } catch (err: any) {
      switch (err.message) {
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
