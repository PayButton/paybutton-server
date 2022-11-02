import { Prisma } from '@prisma/client'
export const prices = [
  { // XECUSD
    value: new Prisma.Decimal('0.00004095051166'),
    createdAt: new Date(),
    updatedAt: new Date(),
    timestamp: 166459320,
    networkId: 1,
    quoteId: 1
  },
  { // XECBTC
    value: new Prisma.Decimal('0.00000000211572'),
    createdAt: new Date(),
    updatedAt: new Date(),
    timestamp: 166459320,
    networkId: 1,
    quoteId: 2
  },
  { // BCHUSD
    value: new Prisma.Decimal('117.90816992278000'),
    createdAt: new Date(),
    updatedAt: new Date(),
    timestamp: 166459320,
    networkId: 2,
    quoteId: 1
  },
  { // BCHBTC
    value: new Prisma.Decimal('0.00609597812323'),
    createdAt: new Date(),
    updatedAt: new Date(),
    timestamp: 166459320,
    networkId: 2,
    quoteId: 2
  }
]
