import { NextApiResponse, NextApiRequest } from 'next/types'
import { getAddress } from 'services/bchdService';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { address } = req.query;

    if (!address) {
      res.send({ message: 'Missing Address parameter' });
    }

    const response = await getAddress(address);
    res.status(200).send(response);
  } catch (e) {
    res.status(500).send(e.message);
  }
}
