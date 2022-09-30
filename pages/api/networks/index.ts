import { NextApiRequest, NextApiResponse } from 'next'
import * as networkService from 'services/networkService'
import { appInfo } from 'config/appInfo'

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    try {
      let networkList
      if (appInfo.showTestNetworks === true) {
        networkList = await networkService.getAllNetworks()
      } else {
        networkList = await networkService.getAllMainNetworks()
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
