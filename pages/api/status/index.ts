import { NextApiRequest, NextApiResponse } from 'next'
import { NodeJsGlobalChronk } from 'services/blockchainService'
import { fromHash160 } from 'services/chronikService'

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    try {
      const chronik = (global as unknown as NodeJsGlobalChronk).chronik
      const jsonRes = {} as any
      jsonRes.subscribedAddresses = chronik.subscribedAddresses
      const asAny = chronik as any // To access private properties
      jsonRes.subs = asAny.chronikWSEndpoint._subs.map((sub: any) => fromHash160(sub.scriptType, sub.scriptPayload))
      res.status(200).json(jsonRes)
    } catch (err: any) {
      switch (err.message) {
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
