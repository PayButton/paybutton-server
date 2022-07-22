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

describe('Amount transactioned', () => {
  it('Negative transaction', async () => {
    const amount = await transactionsService.getTransactionAmount(
      mockedGrpc.transaction2.toObject(),
      mockedAddress.address
    )
    expect(amount.toString()).toBe('-0.00000546')
  })
  it('Positive transaction', async () => {
    const amount = await transactionsService.getTransactionAmount(
      mockedGrpc.transaction1.toObject(),
      mockedAddress.address
    )
    expect(amount.toString()).toBe('4.31247724')
  })
})
