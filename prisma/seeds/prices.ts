import { Prisma } from '@prisma/client'
export const prices = [
  { // XECUSD
    value: new Prisma.Decimal('0.00004095'),
    createdAt: new Date(),
    updatedAt: new Date(),
    timestamp: 1664593200,
    networkId: 1,
    quoteId: 1
  },
  { // XECCAD
    value: new Prisma.Decimal('0.00005663'),
    createdAt: new Date(),
    updatedAt: new Date(),
    timestamp: 1664593200,
    networkId: 1,
    quoteId: 2
  },
  { // BCHUSD
    value: new Prisma.Decimal('117.9081'),
    createdAt: new Date(),
    updatedAt: new Date(),
    timestamp: 1664593200,
    networkId: 2,
    quoteId: 1
  },
  { // BCHCAD
    value: new Prisma.Decimal('163.0735'),
    createdAt: new Date(),
    updatedAt: new Date(),
    timestamp: 1664593200,
    networkId: 2,
    quoteId: 2
  }
]
