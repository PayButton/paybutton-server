import { NETWORK_SLUGS, NETWORK_IDS } from '../../constants/index'

export const networks = [
  {
    id: NETWORK_IDS.XEC,
    slug: NETWORK_SLUGS.ecash,
    ticker: 'xec',
    title: 'eCash',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: NETWORK_IDS.BCH,
    slug: NETWORK_SLUGS.bitcoincash,
    ticker: 'bch',
    title: 'Bitcoin Cash',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 3,
    slug: NETWORK_SLUGS.ectest,
    ticker: 'xec',
    title: 'eCash Testnet Faucet',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 4,
    slug: NETWORK_SLUGS.bchtest,
    ticker: 'bch',
    title: 'Bitcoin Cash Testnet',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 5,
    slug: NETWORK_SLUGS.bchreg,
    ticker: 'bch',
    title: 'Bitcoin Cash Regtest',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]
