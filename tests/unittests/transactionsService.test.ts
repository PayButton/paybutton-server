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

  it('Convert hash from base64 to hex', async () => {
    const result = await transactionsService.base64HashToHex(
      '4xiLDnvh5p1cIPpTW7wa2Xgs53iIIyNgrp2v3hClie0='
    )
    expect(result).toEqual('ed89a510deaf9dae6023238878e72c78d91abc5b53fa205c9de6e17b0e8b18e3')
  })
})
