import * as httpMocks from 'node-mocks-http'
import prisma from 'prisma/clientInstance'
import { createPaybutton } from 'services/paybuttonsService'
import { SUPPORTED_ADDRESS_PATTERN } from 'constants/index'
import { Paybutton } from '@prisma/client'
import RandExp from 'randexp'

export const testEndpoint = async (requestOptions: httpMocks.RequestOptions, endpoint: Function): Promise<httpMocks.MockResponse<any>> => {
  const req = httpMocks.createRequest(requestOptions)
  const res = httpMocks.createResponse()
  await endpoint(req, res)
  return res
}

export const clearPaybuttons = async (): Promise<void> => {
  const x = prisma.paybuttonAddress.deleteMany({})
  const y = prisma.paybutton.deleteMany({})
  await prisma.$transaction([x, y])
}

const addressRandexp = new RandExp(SUPPORTED_ADDRESS_PATTERN)

export const createPaybuttonForUser = async (userId: string): Promise<Paybutton> => {
  const prefixedAddressList = [
    'bitcoincash:' + addressRandexp.gen(),
    'ecash:' + addressRandexp.gen()
  ]
  const name = Math.random().toString(36).slice(2)
  return await createPaybutton(userId, name, prefixedAddressList)
}

export const countPaybuttons = async (): Promise<number> => {
  const paybuttonList = await prisma.paybutton.findMany({})
  return paybuttonList.length
}

export const countPaybuttonAddresses = async (): Promise<number> => {
  const paybuttonAddressList = await prisma.paybuttonAddress.findMany({})
  return paybuttonAddressList.length
}
