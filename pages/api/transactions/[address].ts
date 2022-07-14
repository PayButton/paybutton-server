import { NextApiResponse, NextApiRequest } from 'next'
import { parseAddress } from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'
import { fetchPaybuttonAddressesBySubstring } from 'services/paybuttonAddressesService'

const { ADDRESS_NOT_PROVIDED_400 } = RESPONSE_MESSAGES

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    try {
      const address = parseAddress(req.query.address as string)
      if (address === '' || address === undefined) {
        throw new Error(ADDRESS_NOT_PROVIDED_400.message)
      }
      const paybuttonAddress = await fetchPaybuttonAddressesBySubstring(address)
      res.status(200).send(paybuttonAddress.receivedTransactions)
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
