import { NETWORK_SLUGS } from '../../constants/index'

export const networks = [
  {
    slug: NETWORK_SLUGS.ecash,
    ticker: 'xec',
    title: 'eCash',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: NETWORK_SLUGS.bitcoincash,
    ticker: 'bch',
    title: 'Bitcoin Cash',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: NETWORK_SLUGS.ectest,
    ticker: 'xec',
    title: 'eCash Testnet Faucet',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: NETWORK_SLUGS.bchtest,
    ticker: 'bch',
    title: 'Bitcoin Cash Testnet',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    slug: NETWORK_SLUGS.bchreg,
    ticker: 'bch',
    title: 'Bitcoin Cash Regtest',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]
