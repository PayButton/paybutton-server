import prisma from 'prisma/clientInstance'
import * as transactionService from 'services/transactionService'
import { prismaMock } from 'prisma/mockedClient'
import { mockedBCHAddress, mockedUSDPriceOnTransaction, mockedCADPriceOnTransaction, mockedTransaction, mockedUserProfile, mockedAddressIdList, mockedTransactionList } from '../mockedObjects'
import { CacheSet } from 'redis/index'
import { Prisma } from '@prisma/client'
import * as addressService from 'services/addressService'
import { RESPONSE_MESSAGES } from 'constants/index'

const includePrices = {
  prices: {
    include: {
      price: true
    }
  }
}

const includeAddressAndPrices = {
  address: true,
  ...includePrices
}

describe('Create services', () => {
  it('Return created transaction', async () => {
    prismaMock.transaction.upsert.mockResolvedValue(mockedTransaction)
    prisma.transaction.upsert = prismaMock.transaction.upsert

    prismaMock.transaction.findUniqueOrThrow.mockResolvedValue(mockedTransaction)
    prisma.transaction.findUniqueOrThrow = prismaMock.transaction.findUniqueOrThrow

    prismaMock.transaction.findUnique.mockResolvedValue(mockedTransaction)
    prisma.transaction.findUnique = prismaMock.transaction.findUnique

    prismaMock.address.findMany.mockResolvedValue([mockedBCHAddress])
    prisma.address.findMany = prismaMock.address.findMany

    prismaMock.address.findUnique.mockResolvedValue(mockedBCHAddress)
    prisma.address.findUnique = prismaMock.address.findUnique

    prismaMock.userProfile.findMany.mockResolvedValue([mockedUserProfile])
    prisma.userProfile.findMany = prismaMock.userProfile.findMany

    prismaMock.price.findUnique.mockResolvedValue(mockedUSDPriceOnTransaction.price)
    prisma.price.findUnique = prismaMock.price.findUnique

    prismaMock.pricesOnTransactions.upsert.mockResolvedValue(mockedUSDPriceOnTransaction)
    prisma.pricesOnTransactions.upsert = prismaMock.pricesOnTransactions.upsert

    prismaMock.pricesOnTransactions.deleteMany.mockResolvedValue({ count: 2 })
    prisma.pricesOnTransactions.deleteMany = prismaMock.pricesOnTransactions.deleteMany

    const mockCacheTx = jest.spyOn(CacheSet, 'txCreation')
    mockCacheTx.mockImplementation(async () => {
      // Do nothing
    })

    const mockCacheTxs = jest.spyOn(CacheSet, 'txsCreation')
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
      {
        ...mockedTransaction,
        prices: [
          {
            ...mockedUSDPriceOnTransaction,
            price: {
              ...mockedUSDPriceOnTransaction.price,
              value: new Prisma.Decimal('-2')
            }
          },
          {
            ...mockedCADPriceOnTransaction,
            price: {
              ...mockedCADPriceOnTransaction.price,
              value: new Prisma.Decimal('-3')
            }
          }
        ]
      }
    )
    expect(amount.usd.toString()).toBe('-8.62495448')
    expect(amount.cad.toString()).toBe('-12.93743172')
  })
  it('Positive transaction', async () => {
    const amount = await transactionService.getTransactionValue(mockedTransaction)
    expect(amount.usd.toString()).toBe('0.0000758564746516')
    expect(amount.cad.toString()).toBe('0.000075899599424')
  })
})

describe('Fetch transactions by paybuttonId', () => {
  it('fetch transactions by paybuttonId', async () => {
    prismaMock.transaction.findMany.mockResolvedValue(mockedTransactionList)
    prisma.transaction.findMany = prismaMock.transaction.findMany
    prisma.addressesOnButtons.findMany = prismaMock.addressesOnButtons.findMany

    jest.spyOn(addressService, 'fetchAddressesByPaybuttonId').mockImplementation(async (_: string) => {
      return mockedAddressIdList
    })

    const query = {
      where: {
        addressId: {
          in: mockedAddressIdList
        },
        address: {
          networkId: {
            in: [1, 2]
          }
        }
      },
      orderBy: {
        timestamp: 'asc'
      },
      include: includeAddressAndPrices
    }

    const result = await transactionService.fetchTransactionsByPaybuttonId('mock')

    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(query)
    expect(result).toHaveLength(mockedTransactionList.length)
    expect(result[0]).toEqual(mockedTransactionList[0])
  })

  it('handle no transaction found for paybuttonId', async () => {
    prismaMock.transaction.findMany.mockResolvedValue([])
    prisma.transaction.findMany = prismaMock.transaction.findMany

    try {
      await transactionService.fetchTransactionsByPaybuttonId('mock')
    } catch (error: any) {
      expect(error.message).toEqual(RESPONSE_MESSAGES.NO_TRANSACTION_FOUND_404.message)
    }
  })
})
