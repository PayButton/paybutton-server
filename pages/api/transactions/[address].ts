import { NextApiResponse, NextApiRequest } from 'next/types'
import * as chainsNodeService from 'services/chainsNodeService'

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const response = await chainsNodeService.getAddressTransactions(req.query.address);
    res.status(200).send(response);
  } catch (e) {
    res.status(500).send(e.message);
  }
}
