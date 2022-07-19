import { NextApiResponse, NextApiRequest } from 'next'
import { parseAddress } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'
import { fetchAddressBySubstring } from 'services/addressesService'

const { ADDRESS_NOT_PROVIDED_400 } = RESPONSE_MESSAGES

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    try {
      if (req.query.address === '' || req.query.address === undefined) {
        throw new Error(ADDRESS_NOT_PROVIDED_400.message)
      }
      const addressString = parseAddress(req.query.address as string)
      const address = await fetchAddressBySubstring(addressString)
      res.status(200).send(address.receivedTransactions)
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
