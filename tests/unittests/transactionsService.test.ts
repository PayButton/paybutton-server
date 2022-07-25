import prisma from 'prisma/clientInstance'
import * as transactionsService from 'services/transactionsService'
import { prismaMock } from 'prisma/mockedClient'
import { mockedTransaction, mockedGrpc, mockedPaybuttonAddress } from '../mockedObjects'

describe('Create services', () => {
  it('Return created transaction', async () => {
    prismaMock.transaction.upsert.mockResolvedValue(mockedTransaction)
    prisma.transaction.upsert = prismaMock.transaction.upsert
    prismaMock.paybuttonAddress.findMany.mockResolvedValue([mockedPaybuttonAddress])
    prisma.paybuttonAddress.findMany = prismaMock.paybuttonAddress.findMany

    const result = await transactionsService.upsertTransaction(
      mockedGrpc.transaction1.toObject(),
      mockedPaybuttonAddress.address
    )
    expect(result).toEqual(mockedTransaction)
  })
})
