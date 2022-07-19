import prisma from 'prisma/clientInstance'
import * as transactionsService from 'services/transactionsService'
import { prismaMock } from 'prisma/mockedClient'
import { mockedTransaction, mockedGrpc, mockedAddress } from '../mockedObjects'

describe('Create services', () => {
  it('Return created transaction', async () => {
    prismaMock.transaction.upsert.mockResolvedValue(mockedTransaction)
    prisma.transaction.upsert = prismaMock.transaction.upsert
    prismaMock.address.findMany.mockResolvedValue([mockedAddress])
    prisma.address.findMany = prismaMock.address.findMany

    const result = await transactionsService.upsertTransaction(
      mockedGrpc.transaction1.toObject(),
      mockedAddress.address
    )
    expect(result).toEqual(mockedTransaction)
  })
})
