import * as httpMocks from 'node-mocks-http'
import prisma from 'prisma/clientInstance'
import { createPaybutton, PaybuttonWithAddresses } from 'services/paybuttonService'
import { createWallet } from 'services/walletService'
import { SUPPORTED_ADDRESS_PATTERN } from 'constants/index'
import { Wallet } from '@prisma/client'
import RandExp from 'randexp'

export const testEndpoint = async (requestOptions: httpMocks.RequestOptions, endpoint: Function): Promise<httpMocks.MockResponse<any>> => {
  const req = httpMocks.createRequest(requestOptions)
  const res = httpMocks.createResponse()
  await endpoint(req, res)
  return res
}

export const clearWallets = async (): Promise<void> => {
  await prisma.wallet.deleteMany({})
}

export const clearPaybuttonsAndAddresses = async (): Promise<void> => {
  const x = prisma.addressesOnButtons.deleteMany({})
  const y = prisma.address.deleteMany({})
  const z = prisma.paybutton.deleteMany({})
  await prisma.$transaction([x, y, z])
}

const addressRandexp = new RandExp(SUPPORTED_ADDRESS_PATTERN)

export const createWalletForUser = async (userId: string, paybuttonIdList: number[]): Promise<Wallet> => {
  const name = Math.random().toString(36).slice(2)
  return await createWallet({ userId, name, paybuttonIdList })
}

export const createPaybuttonForUser = async (userId: string, addressList?: string[]): Promise<PaybuttonWithAddresses> => {
  let prefixedAddressList = [
    'bitcoincash:' + addressRandexp.gen(),
    'ecash:' + addressRandexp.gen()
  ]
  if (addressList !== undefined) {
    prefixedAddressList = addressList
  }
  const name = Math.random().toString(36).slice(2)
  const buttonData = JSON.stringify({ someCustom: 'userData' })
  return await createPaybutton({ userId, name, prefixedAddressList, buttonData })
}

export const countPaybuttons = async (): Promise<number> => {
  const paybuttonList = await prisma.paybutton.findMany({})
  return paybuttonList.length
}

export const countWallets = async (): Promise<number> => {
  const walletList = await prisma.wallet.findMany({})
  return walletList.length
}

export const countAddresses = async (): Promise<number> => {
  const addressList = await prisma.address.findMany({})
  return addressList.length
}

export const exampleAddresses = {
  bitcoincash: 'qrju9pgzn3m84q57ldjvxph30zrm8q7dlc8r8a3eyp',
  bchtest: 'qrcn673f42dl4z8l3xpc0gr5kpxg7ea5mqhj3atxd3',
  ecash: 'qz3ye4namaqlca8zgvdju8uqa2wwx8twd5y8wjd9ru',
  ectest: 'qrfekq9s0c8tcuh75wpcxqnyl5e7dhqk4gq6pjct44'
}
