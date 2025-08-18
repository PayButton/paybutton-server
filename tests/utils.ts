import * as httpMocks from 'node-mocks-http'
import prisma from 'prisma-local/clientInstance'
import { createPaybutton, CreatePaybuttonReturn } from 'services/paybuttonService'
import { createWallet, WalletWithAddressesWithPaybuttons } from 'services/walletService'
import { upsertCurrentPricesForNetworkId } from 'services/priceService'
import { SUPPORTED_ADDRESS_PATTERN } from 'constants/index'
import RandExp from 'randexp'
import { UserProfile } from '@prisma/client'

export const testEndpoint = async (requestOptions: httpMocks.RequestOptions, endpoint: Function, userId?: string): Promise<httpMocks.MockResponse<any>> => {
  const req = httpMocks.createRequest(requestOptions)
  const res = httpMocks.createResponse()
  if (userId !== undefined) {
    req.session = {}
    req.session.userId = userId
  }
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

export const createWalletForUser = async (userId: string, addressIdList: string[], isXECDefault = false, isBCHDefault = false): Promise<WalletWithAddressesWithPaybuttons> => {
  const name = Math.random().toString(36).slice(2)
  return await createWallet({ userId, name, addressIdList, isXECDefault, isBCHDefault })
}

export const createUserProfile = async (userId: string): Promise<UserProfile> => {
  return await prisma.userProfile.create({
    data: {
      id: userId
    }
  })
}

export const createPaybuttonForUser = async (userId: string, addressList?: string[], walletId?: string): Promise<CreatePaybuttonReturn> => {
  const newAddr = 'ecash:' + addressRandexp.gen()
  let prefixedAddressList = [
    'bitcoincash:' + addressRandexp.gen(),
    newAddr
  ]
  if (addressList !== undefined) {
    prefixedAddressList = addressList
  }
  const name = Math.random().toString(36).slice(2)
  const buttonData = JSON.stringify({ someCustom: 'userData' })
  const url = ''
  const description = ''
  return await createPaybutton({ userId, walletId, name, prefixedAddressList, url, description, buttonData })
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

export const createCurrentPrices = async (): Promise<void> => {
  void await upsertCurrentPricesForNetworkId({
    Price_in_CAD: '133',
    Price_in_USD: '122'
  }, 1)
  void await upsertCurrentPricesForNetworkId({
    Price_in_CAD: '13',
    Price_in_USD: '12'
  }, 2)
}
