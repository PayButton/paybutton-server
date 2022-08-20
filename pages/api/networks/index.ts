import { NextApiRequest, NextApiResponse } from 'next'
import * as networksService from 'services/networksService'
import { appInfo } from 'config/appInfo'

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    try {
      let networkList
      if (appInfo.showTestNetworks === true) {
        networkList = await networksService.getAllNetworks()
      } else {
        networkList = await networksService.getAllMainNetworks()
      }
      res.status(200).json(networkList)
    } catch (err: any) {
      switch (err.message) {
        default:
          res.status(500).json({ statusCode: 500, message: err.message })
      }
    }
  }
}
