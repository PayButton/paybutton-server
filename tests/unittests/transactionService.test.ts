import prisma from 'prisma/clientInstance'
import * as transactionService from 'services/transactionService'
import { prismaMock } from 'prisma/mockedClient'
import { mockedTransaction, mockedBCHAddress, mockedUSDPriceOnTransaction } from '../mockedObjects'
import * as dashboardCache from 'redis/dashboardCache'

describe('Create services', () => {
  it('Return created transaction', async () => {
    prismaMock.transaction.upsert.mockResolvedValue(mockedTransaction)
    prisma.transaction.upsert = prismaMock.transaction.upsert

    prismaMock.transaction.findUnique.mockResolvedValue(mockedTransaction)
    prisma.transaction.findUnique = prismaMock.transaction.findUnique

    prismaMock.address.findMany.mockResolvedValue([mockedBCHAddress])
    prisma.address.findMany = prismaMock.address.findMany

    prismaMock.address.findUnique.mockResolvedValue(mockedBCHAddress)
    prisma.address.findUnique = prismaMock.address.findUnique

    prismaMock.price.findUnique.mockResolvedValue(mockedUSDPriceOnTransaction.price)
    prisma.price.findUnique = prismaMock.price.findUnique

    prismaMock.pricesOnTransactions.upsert.mockResolvedValue(mockedUSDPriceOnTransaction)
    prisma.pricesOnTransactions.upsert = prismaMock.pricesOnTransactions.upsert

    const mockCacheTxs = jest.spyOn(dashboardCache, 'cacheManyTxs')
    mockCacheTxs.mockImplementation(async () => {
      // Do nothing
    })

    const { prices, ...argsTransaction } = {
      ...mockedTransaction,
      addressId: mockedBCHAddress.id
    }
    const result = await transactionService.createTransaction(
      argsTransaction
    )
    expect(result).toEqual({
      created: true,
      tx: mockedTransaction
    })
  })

  it('Convert hash from base64 to hex', async () => {
    const result = transactionService.base64HashToHex(
      '4xiLDnvh5p1cIPpTW7wa2Xgs53iIIyNgrp2v3hClie0='
    )
    expect(result).toEqual('ed89a510deaf9dae6023238878e72c78d91abc5b53fa205c9de6e17b0e8b18e3')
  })
})

describe('Amount transactioned', () => {
  it('Negative transaction', async () => {
    const amount = await transactionService.getTransactionValue(
      mockedTransaction
    )
    expect(amount.usd.toString()).toBe('0.0000758564746516')
    expect(amount.cad.toString()).toBe('0.000075899599424')
  })
})
