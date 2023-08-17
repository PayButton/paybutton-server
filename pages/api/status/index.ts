import { NextApiRequest, NextApiResponse } from 'next'
import { NodeJsGlobalChronk } from 'services/blockchainService'

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    try {
      const chronik = (global as unknown as NodeJsGlobalChronk).chronik
      res.status(200).json(chronik.subscribedAddresses)
    } catch (err: any) {
      switch (err.message) {
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
