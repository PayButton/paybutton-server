// Paybutton
// GRPC-BCHRPC

import { Prisma, Price, UserProfile, AddressesOnButtons } from '@prisma/client'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { WalletWithAddressesWithPaybuttons } from 'services/walletService'
import { USD_QUOTE_ID, CAD_QUOTE_ID, XEC_NETWORK_ID, NETWORK_SLUGS } from 'constants/index'

export const mockedPaybutton: PaybuttonWithAddresses = {
  id: '730bfa24-eb57-11ec-b722-0242ac150002',
  providerUserId: 'mocked-uid',
  name: 'mocked-name',
  url: 'mocked-url',
  description: 'mocked-description',
  buttonData: 'mockedData',
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z'),
  addresses: [
    {
      address: {
        syncing: false,
        id: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
        address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        lastSynced: null,
        networkId: 1
      }
    },
    {
      address: {
        syncing: false,
        id: 'a37b9a8c-d262-468b-b1dd-571434a16308',
        address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        lastSynced: null,
        networkId: 2
      }
    }
  ]
}

export const mockedBCHAddress = {
  id: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
  address: 'bitcoincash:qzqh7rwaq9zm4zcv40lh9c9u50gy07gcesdmja8426',
  syncing: false,
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z'),
  networkId: 2,
  lastSynced: null,
  paybuttonId: 'bfe90894-b1f4-11ed-b556-0242ac120003',
  walletId: null
}

export const mockedXECAddress = {
  id: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
  address: 'ecash:qrmm7edwuj4jf7tnvygjyztyy0a0qxvl7quss2vxek',
  syncing: false,
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z'),
  lastSynced: null,
  networkId: 1,
  paybuttonId: 'bfe90894-b1f4-11ed-b556-0242ac120003',
  walletId: null
}

export const mockedAddressesOnUserProfile = {
  addressId: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
  userId: 'ddde6236-bde3-425f-b0fc-13a007cc584b',
  walletId: '570fbb7e-fc7f-4096-8541-e68405cf9b56',
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z'),
  address: {
    id: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
    address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
    syncing: false,
    createdAt: new Date('2022-05-27T15:18:42.000Z'),
    updatedAt: new Date('2022-05-27T15:18:42.000Z'),
    networkId: 1,
    lastSynced: new Date('2022-05-27T15:18:42.000Z'),
    paybuttons: [
      {
        paybuttonId: 'bfe90894-b1f4-11ed-b556-0242ac120003',
        addressId: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        paybutton: {
          id: 'bfe90894-b1f4-11ed-b556-0242ac120003',
          name: 'Mocked Paybutton 1',
          url: 'mocked-url',
          description: 'mocked-description',
          buttonData: '{"example": "value"}',
          providerUserId: 'dev-uid',
          createdAt: new Date('2022-05-27T15:18:42.000Z'),
          updatedAt: new Date('2022-05-27T15:18:42.000Z')
        }
      },
      {
        paybuttonId: 'bfe92acd-b1f4-11ed-b556-0242ac120003',
        addressId: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        paybutton: {
          id: 'bfe92acd-b1f4-11ed-b556-0242ac120003',
          name: 'Mocked Paybutton 2',
          url: 'mocked-url',
          description: 'mocked-description',
          buttonData: '{}',
          providerUserId: 'dev-uid',
          createdAt: new Date('2022-05-27T15:18:42.000Z'),
          updatedAt: new Date('2022-05-27T15:18:42.000Z')
        }
      }
    ]
  }
}

export const mockedAddressList = [
  {
    id: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
    address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
    syncing: false,
    createdAt: new Date('2022-05-27T15:18:42.000Z'),
    updatedAt: new Date('2022-05-27T15:18:42.000Z'),
    lastSynced: null,
    networkId: 1,
    walletId: null
  },
  {
    id: 'a37b9a8c-d262-468b-b1dd-571434a16308',
    address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
    syncing: false,
    createdAt: new Date('2022-05-27T15:18:42.000Z'),
    updatedAt: new Date('2022-05-27T15:18:42.000Z'),
    lastSynced: null,
    networkId: 2,
    walletId: null
  },
  {
    id: '1ca6b7f5-6930-42a7-8ea4-8de57de03251',
    address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
    syncing: false,
    createdAt: new Date('2022-05-27T15:18:42.000Z'),
    updatedAt: new Date('2022-05-27T15:18:42.000Z'),
    lastSynced: null,
    networkId: 1,
    walletId: null
  },
  {
    id: '4f68e74f-de19-467a-b195-139d98217ada',
    address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
    syncing: false,
    createdAt: new Date('2022-05-27T15:18:42.000Z'),
    updatedAt: new Date('2022-05-27T15:18:42.000Z'),
    lastSynced: null,
    networkId: 2,
    walletId: null
  }
]

export const mockedPaybuttonList = [
  {
    id: '730bfa24-eb57-11ec-b722-0242ac150002',
    providerUserId: 'mocked-uid',
    name: 'mocked-name-1',
    url: 'mocked-url',
    description: 'mocked-description',
    buttonData: 'mockedData',
    createdAt: new Date('2022-05-27T15:18:42.000Z'),
    updatedAt: new Date('2022-05-27T15:18:42.000Z'),
    addresses: [
      {
        address: mockedAddressList[0]
      },
      {
        address: mockedAddressList[1]
      }
    ]
  },
  {
    id: '133fb8aa-eb57-11ec-b722-0242ac150002',
    providerUserId: 'mocked-uid',
    name: 'mocked-name-2',
    url: 'mocked-url',
    description: 'mocked-description',
    buttonData: 'mockedData',
    createdAt: new Date('2022-05-27T15:18:42.000Z'),
    updatedAt: new Date('2022-05-27T15:18:42.000Z'),
    addresses: [
      {
        address: mockedAddressList[2]
      },
      {
        address: mockedAddressList[3]
      }
    ]
  },
  mockedPaybutton
]

export const mockedBCHAddressWithPaybutton = { ...mockedBCHAddress } as any
mockedBCHAddressWithPaybutton.paybuttons = [
  {
    paybutton: mockedPaybuttonList[2]
  },
  {
    address: mockedPaybuttonList[3]
  }
]

// Wallet
export const mockedWallet: WalletWithAddressesWithPaybuttons = {
  id: '0da1977f-d65b-43a7-a7c8-b2a1f01da7a0',
  createdAt: new Date('2022-09-30T18:01:32.456Z'),
  updatedAt: new Date('2022-09-30T18:01:32.456Z'),
  name: 'mockedWallet',
  providerUserId: 'mocked-uid',
  userProfile: {
    isXECDefault: null,
    isBCHDefault: null,
    userId: 'ddde6236-bde3-425f-b0fc-13a007cc584b'
  },
  userAddresses: [
    {
      addressId: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
      userId: 'ddde6236-bde3-425f-b0fc-13a007cc584b',
      walletId: '570fbb7e-fc7f-4096-8541-e68405cf9b56',
      createdAt: new Date('2022-05-27T15:18:42.000Z'),
      updatedAt: new Date('2022-05-27T15:18:42.000Z'),
      address: {
        syncing: false,
        id: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
        address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        networkId: 1,
        lastSynced: new Date('2022-05-27T15:18:42.000Z'),
        paybuttons: [
          {
            paybuttonId: 'bfe90894-b1f4-11ed-b556-0242ac120003',
            addressId: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
            createdAt: new Date('2022-05-27T15:18:42.000Z'),
            updatedAt: new Date('2022-05-27T15:18:42.000Z'),
            paybutton: {
              id: 'bfe90894-b1f4-11ed-b556-0242ac120003',
              name: 'Mocked Paybutton 1',
              url: 'mocked-url',
              description: 'mocked-description',
              buttonData: '{"example": "value"}',
              providerUserId: 'dev-uid',
              createdAt: new Date('2022-05-27T15:18:42.000Z'),
              updatedAt: new Date('2022-05-27T15:18:42.000Z')
            }
          },
          {
            paybuttonId: 'bfe92acd-b1f4-11ed-b556-0242ac120003',
            addressId: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
            createdAt: new Date('2022-05-27T15:18:42.000Z'),
            updatedAt: new Date('2022-05-27T15:18:42.000Z'),
            paybutton: {
              id: 'bfe92acd-b1f4-11ed-b556-0242ac120003',
              name: 'Mocked Paybutton 2',
              url: 'mocked-url',
              description: 'mocked-description',
              buttonData: '{}',
              providerUserId: 'dev-uid',
              createdAt: new Date('2022-05-27T15:18:42.000Z'),
              updatedAt: new Date('2022-05-27T15:18:42.000Z')
            }
          }
        ]
      }
    },
    {
      addressId: 'a37b9a8c-d262-468b-b1dd-571434a16308',
      userId: 'ddde6236-bde3-425f-b0fc-13a007cc584b',
      walletId: '0da1977f-d65b-43a7-a7c8-b2a1f01da7a0',
      createdAt: new Date('2022-05-27T15:18:42.000Z'),
      updatedAt: new Date('2022-05-27T15:18:42.000Z'),
      address: {
        syncing: false,
        id: 'a37b9a8c-d262-468b-b1dd-571434a16308',
        address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        networkId: 2,
        lastSynced: new Date('2022-05-27T15:18:42.000Z'),
        paybuttons: [
          {
            paybuttonId: 'bfe90b48-b1f4-11ed-b556-0242ac120003',
            addressId: 'a37b9a8c-d262-468b-b1dd-571434a16308',
            createdAt: new Date('2022-05-27T15:18:42.000Z'),
            updatedAt: new Date('2022-05-27T15:18:42.000Z'),
            paybutton: {
              id: 'bfe90b48-b1f4-11ed-b556-0242ac120003',
              name: 'Mocked Paybutton 3',
              url: 'mocked-url',
              description: 'mocked-description',
              buttonData: '{}',
              providerUserId: 'dev-uid',
              createdAt: new Date('2022-05-27T15:18:42.000Z'),
              updatedAt: new Date('2022-05-27T15:18:42.000Z')
            }
          },
          {
            paybuttonId: 'bfe92acd-b1f4-11ed-b556-0242ac120003',
            addressId: 'a37b9a8c-d262-468b-b1dd-571434a16308',
            createdAt: new Date('2022-05-27T15:18:42.000Z'),
            updatedAt: new Date('2022-05-27T15:18:42.000Z'),
            paybutton: {
              id: 'bfe92acd-b1f4-11ed-b556-0242ac120003',
              name: 'Mocked Paybutton 4',
              url: 'mocked-url',
              description: 'mocked-description',
              buttonData: '{}',
              providerUserId: 'dev-uid',
              createdAt: new Date('2022-05-27T15:18:42.000Z'),
              updatedAt: new Date('2022-05-27T15:18:42.000Z')
            }
          }
        ]
      }
    }
  ]
}

export const mockedWalletList = [
  {
    id: '0da1977f-d65b-43a7-a7c8-b2a1f01da7a0',
    createdAt: new Date('2022-09-30T18:01:32.456Z'),
    updatedAt: new Date('2022-09-30T18:01:32.456Z'),
    name: 'mockedWallet',
    providerUserId: 'mocked-uid',
    userAddresses: []
  },
  {
    id: '1f79bbe4-1c56-48af-b703-b22efd629104',
    createdAt: new Date('2022-09-30T18:01:32.456Z'),
    updatedAt: new Date('2022-09-30T18:01:32.456Z'),
    name: 'mockedWallet2',
    providerUserId: 'mocked-uid',
    userAddresses: []
  }
]

export const mockedWalletsOnUserProfile = {
  walletId: '1f79bbe4-1c56-48af-b703-b22efd629104',
  userId: 'ddde6236-bde3-425f-b0fc-13a007cc584b',
  addressId: '-',
  isXECDefault: null,
  isBCHDefault: null,
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z')
}

// Network
export const mockedNetwork = {
  id: 1,
  slug: NETWORK_SLUGS.bitcoincash,
  ticker: 'bch',
  title: 'Bitcoin Cash',
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z')
}

// Transaction
export const mockedCADPriceOnTransaction = {
  priceId: 1,
  transactionId: 'mocked-uuid',
  createdAt: new Date('2022-11-02T15:18:42.000Z'),
  updatedAt: new Date('2022-11-02T15:18:42.000Z'),
  price: {
    id: 1,
    value: new Prisma.Decimal('0.00001760'),
    createdAt: new Date('2022-11-02T15:18:42.000Z'),
    updatedAt: new Date('2022-11-02T15:18:42.000Z'),
    timestamp: 1606632380,
    networkId: 1,
    quoteId: 2
  }
}

export const mockedUSDPriceOnTransaction = {
  priceId: 2,
  transactionId: 'mocked-uuid',
  createdAt: new Date('2022-11-02T15:18:42.000Z'),
  updatedAt: new Date('2022-11-02T15:18:42.000Z'),
  price: {
    id: 2,
    value: new Prisma.Decimal('0.00001759'),
    createdAt: new Date('2022-11-02T15:18:42.000Z'),
    updatedAt: new Date('2022-11-02T15:18:42.000Z'),
    timestamp: 1606632380,
    networkId: 1,
    quoteId: 1
  }
}

export const mockedTransaction = {
  id: 'mocked-uuid',
  hash: 'Yh5DRDjd3AarAvQA1nwpPI4daDihY6hQfnMV6UKFqZc=',
  opReturn: '',
  addressId: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
  confirmed: true,
  address: {
    id: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
    address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
    createdAt: new Date('2022-11-02T15:18:42.000Z'),
    updatedAt: new Date('2022-11-02T15:18:42.000Z'),
    networkId: 1,
    walletId: '0da1977f-d65b-43a7-a7c8-b2a1f01da7a0'
  },
  amount: new Prisma.Decimal('4.31247724'),
  timestamp: 1657130467,
  createdAt: new Date('2022-11-02T15:18:42.000Z'),
  updatedAt: new Date('2022-11-02T15:18:42.000Z'),
  prices: [
    mockedUSDPriceOnTransaction,
    mockedCADPriceOnTransaction
  ]
}

export const mockedTransactionList = [
  {
    id: 'mocked-uuid',
    hash: 'Yh5DRDjd3AarAvQA1nwpPI4daDihY6hQfnMV6UKFqZc=',
    opReturn: '',
    confirmed: true,
    addressId: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
    createdAt: new Date('2022-11-02T15:18:42.000Z'),
    updatedAt: new Date('2022-11-02T15:18:42.000Z'),
    amount: new Prisma.Decimal('4.31247724'),
    timestamp: 1657130467
  },
  {
    id: 'mocked-uuid2',
    hash: 'hh5DRDjd3AarAvQA1nwpPI4daDihY6hQfnMV6UKFqZc=',
    opReturn: '',
    confirmed: true,
    addressId: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
    createdAt: new Date('2022-11-02T15:18:42.000Z'),
    updatedAt: new Date('2022-11-02T15:18:42.000Z'),
    amount: new Prisma.Decimal('1.5'),
    timestamp: 1657130467
  },
  {
    id: 'mocked-uuid3',
    hash: '5h5DRDjd3AarAvQA1nwpPI4daDihY6hQfnMV6UKFqZc=',
    opReturn: '',
    confirmed: true,
    addressId: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
    createdAt: new Date('2022-11-02T15:18:42.000Z'),
    updatedAt: new Date('2022-11-02T15:18:42.000Z'),
    amount: new Prisma.Decimal('0.2'),
    timestamp: 1657130467
  }
]

export const mockedUSDPrice = {
  id: 1,
  value: new Prisma.Decimal(10),
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z'),
  timestamp: 1653459437,
  networkId: XEC_NETWORK_ID,
  quoteId: USD_QUOTE_ID
}

export const mockedCADPrice = {
  id: 1,
  value: new Prisma.Decimal(18),
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z'),
  timestamp: 1653459437,
  networkId: XEC_NETWORK_ID,
  quoteId: CAD_QUOTE_ID
}

export const mockPrices: Price[] = [
  { // XECUSD
    id: 0,
    value: new Prisma.Decimal('0.00004095'),
    createdAt: new Date(),
    updatedAt: new Date(),
    timestamp: 1664593200,
    networkId: 1,
    quoteId: 1
  },
  { // XECCAD
    id: 0,
    value: new Prisma.Decimal('0.00005663'),
    createdAt: new Date(),
    updatedAt: new Date(),
    timestamp: 1664593200,
    networkId: 1,
    quoteId: 2
  },
  { // BCHUSD
    id: 0,
    value: new Prisma.Decimal('117.9081'),
    createdAt: new Date(),
    updatedAt: new Date(),
    timestamp: 1664593200,
    networkId: 2,
    quoteId: 1
  },
  { // BCHCAD
    id: 0,
    value: new Prisma.Decimal('163.0735'),
    createdAt: new Date(),
    updatedAt: new Date(),
    timestamp: 1664593200,
    networkId: 2,
    quoteId: 2
  }
]

export const mockedUserProfile: UserProfile = {
  id: 'mocked-user-profileb0fc-13a007cc584b',
  organizationId: null,
  publicKey: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  isAdmin: false,
  lastSentVerificationEmailAt: null,
  preferredCurrencyId: 1,
  preferredTimezone: '',
  emailCredits: 15,
  proUntil: null
}

export const mockedUserProfileWithPublicKey: UserProfile = {
  organizationId: null,
  id: 'mocked-user-profileb0fc-13a007cc584b',
  publicKey: 'mocked-already-set-public-key-1b3a0d9f',
  createdAt: new Date(),
  updatedAt: new Date(),
  isAdmin: false,
  lastSentVerificationEmailAt: null,
  preferredCurrencyId: 1,
  preferredTimezone: '',
  emailCredits: 15,
  proUntil: null
}

export const mockedAddressesOnButtons: AddressesOnButtons[] = [
  {
    paybuttonId: '3f3c4415-2ccc-11ef-b540-0242ac120002',
    addressId: '0a03a880-86fe-4d82-9aa2-8df270cf032d',
    createdAt: new Date('2024-06-17T17:16:07.549Z'),
    updatedAt: new Date('2024-06-17T17:16:07.549Z')
  },
  {
    paybuttonId: '3f3c4415-2ccc-11ef-b540-0242ac120002',
    addressId: '48ea75c9-2ccd-11ef-b540-0242ac120002',
    createdAt: new Date('2024-06-17T17:16:07.549Z'),
    updatedAt: new Date('2024-06-17T17:16:07.549Z')
  }
]

export const mockedAddressIdList = [
  '0a03a880-86fe-4d82-9aa2-8df270cf032d',
  'a37b9a8c-d262-468b-b1dd-571434a16308',
  '1ca6b7f5-6930-42a7-8ea4-8de57de03251',
  '4f68e74f-de19-467a-b195-139d98217ada'
]
