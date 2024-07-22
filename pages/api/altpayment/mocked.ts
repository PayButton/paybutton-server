import { NextApiResponse, NextApiRequest } from 'next/types'

export default async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  if (req.method === 'GET') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(200).json({
      id: 'mockedSideshiftId',
      createdAt: '2024-07-19T11:39:54.614Z',
      depositCoin: 'AVAX',
      settleCoin: 'XEC',
      depositNetwork: 'avax',
      settleNetwork: 'xec',
      depositAddress: '0xEe13B7596a20FA7a546257dc240cFc6E8c2294Ab',
      settleAddress: 'ecash:mockedecashaddress',
      depositMin: '56',
      depositMax: '56',
      type: 'fixed',
      quoteId: '34cb48bb-e6b5-4df4-a0a9-ad12791bdcee',
      depositAmount: '56',
      settleAmount: '41896339.65',
      expiresAt: '2024-07-19T11:54:51.291Z',
      status: 'settled',
      averageShiftSeconds: '4.629559',
      rate: '748148.922321428571'
    })
  }
}
