import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

import prisma from 'prisma/clientInstance'

jest.mock('./clientInstance', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>()
}))

beforeEach(() => {
  mockReset(prismaMock)
})

afterAll(async () => {
  await prisma.$disconnect()
})

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>
