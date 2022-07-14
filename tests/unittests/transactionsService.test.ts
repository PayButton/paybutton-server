import prisma from 'prisma/clientInstance'
import * as transactionsService from 'services/transactionsService'
import { prismaMock } from 'prisma/mockedClient'
import { mockedTransaction, mockedGrpc, mockedPaybuttonAddress } from '../mockedObjects'

describe('Create services', () => {
  it('Return created transaction', async () => {
    prismaMock.transaction.create.mockResolvedValue(mockedTransaction)
    prisma.transaction.create = prismaMock.transaction.create
    prismaMock.paybuttonAddress.findMany.mockResolvedValue([mockedPaybuttonAddress])
    prisma.paybuttonAddress.findMany = prismaMock.paybuttonAddress.findMany

    const result = await transactionsService.upsertTransaction(
      mockedGrpc.transaction1.toObject(),
      mockedPaybuttonAddress.address
    )
    expect(result).toEqual(mockedTransaction)
  })
})
