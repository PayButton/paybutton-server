import { Prisma, Price } from '@prisma/client'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { WalletWithAddressesWithPaybuttons } from 'services/walletService'
import { USD_QUOTE_ID, CAD_QUOTE_ID, XEC_NETWORK_ID, NETWORK_SLUGS } from 'constants/index'

export const mockedPaybutton: PaybuttonWithAddresses = {
  id: '730bfa24-eb57-11ec-b722-0242ac150002',
  providerUserId: 'mocked-uid',
  name: 'mocked-name',
  buttonData: 'mockedData',
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z'),
  addresses: [
    {
      address: {
        id: 1,
        address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        lastSynced: null,
        networkId: 1
      }
    },
    {
      address: {
        id: 2,
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
  id: 1,
  address: 'bitcoincash:qzqh7rwaq9zm4zcv40lh9c9u50gy07gcesdmja8426',
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z'),
  networkId: 2,
  lastSynced: null,
  paybuttonId: 'bfe90894-b1f4-11ed-b556-0242ac120003',
  walletId: null
}

export const mockedXECAddress = {
  id: 1,
  address: 'ecash:qrmm7edwuj4jf7tnvygjyztyy0a0qxvl7quss2vxek',
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z'),
  lastSynced: null,
  networkId: 1,
  paybuttonId: 'bfe90894-b1f4-11ed-b556-0242ac120003',
  walletId: null
}

export const mockedAddressesOnUserProfile = {
  addressId: 1,
  userProfileId: 1,
  walletId: 8,
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z'),
  address: {
    id: 1,
    address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
    createdAt: new Date('2022-05-27T15:18:42.000Z'),
    updatedAt: new Date('2022-05-27T15:18:42.000Z'),
    networkId: 1,
    lastSynced: new Date('2022-05-27T15:18:42.000Z'),
    paybuttons: [
      {
        paybuttonId: 'bfe90894-b1f4-11ed-b556-0242ac120003',
        addressId: 1,
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        paybutton: {
          id: 'bfe90894-b1f4-11ed-b556-0242ac120003',
          name: 'Mocked Paybutton 1',
          buttonData: '{"example": "value"}',
          providerUserId: 'dev-uid',
          createdAt: new Date('2022-05-27T15:18:42.000Z'),
          updatedAt: new Date('2022-05-27T15:18:42.000Z')
        }
      },
      {
        paybuttonId: 'bfe92acd-b1f4-11ed-b556-0242ac120003',
        addressId: 1,
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        paybutton: {
          id: 'bfe92acd-b1f4-11ed-b556-0242ac120003',
          name: 'Mocked Paybutton 2',
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
    id: 1,
    address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
    createdAt: new Date('2022-05-27T15:18:42.000Z'),
    updatedAt: new Date('2022-05-27T15:18:42.000Z'),
    lastSynced: null,
    networkId: 1,
    walletId: null
  },
  {
    id: 2,
    address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
    createdAt: new Date('2022-05-27T15:18:42.000Z'),
    updatedAt: new Date('2022-05-27T15:18:42.000Z'),
    lastSynced: null,
    networkId: 2,
    walletId: null
  },
  {
    id: 3,
    address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
    createdAt: new Date('2022-05-27T15:18:42.000Z'),
    updatedAt: new Date('2022-05-27T15:18:42.000Z'),
    lastSynced: null,
    networkId: 1,
    walletId: null
  },
  {
    id: 4,
    address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
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
  id: 1,
  createdAt: new Date('2022-09-30T18:01:32.456Z'),
  updatedAt: new Date('2022-09-30T18:01:32.456Z'),
  name: 'mockedWallet',
  providerUserId: 'mocked-uid',
  userProfile: {
    isXECDefault: null,
    isBCHDefault: null,
    userProfileId: 1
  },
  userAddresses: [
    {
      addressId: 1,
      userProfileId: 1,
      walletId: 8,
      createdAt: new Date('2022-05-27T15:18:42.000Z'),
      updatedAt: new Date('2022-05-27T15:18:42.000Z'),
      address: {
        id: 1,
        address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        networkId: 1,
        lastSynced: new Date('2022-05-27T15:18:42.000Z'),
        paybuttons: [
          {
            paybuttonId: 'bfe90894-b1f4-11ed-b556-0242ac120003',
            addressId: 1,
            createdAt: new Date('2022-05-27T15:18:42.000Z'),
            updatedAt: new Date('2022-05-27T15:18:42.000Z'),
            paybutton: {
              id: 'bfe90894-b1f4-11ed-b556-0242ac120003',
              name: 'Mocked Paybutton 1',
              buttonData: '{"example": "value"}',
              providerUserId: 'dev-uid',
              createdAt: new Date('2022-05-27T15:18:42.000Z'),
              updatedAt: new Date('2022-05-27T15:18:42.000Z')
            }
          },
          {
            paybuttonId: 'bfe92acd-b1f4-11ed-b556-0242ac120003',
            addressId: 1,
            createdAt: new Date('2022-05-27T15:18:42.000Z'),
            updatedAt: new Date('2022-05-27T15:18:42.000Z'),
            paybutton: {
              id: 'bfe92acd-b1f4-11ed-b556-0242ac120003',
              name: 'Mocked Paybutton 2',
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
      addressId: 2,
      userProfileId: 1,
      walletId: 1,
      createdAt: new Date('2022-05-27T15:18:42.000Z'),
      updatedAt: new Date('2022-05-27T15:18:42.000Z'),
      address: {
        id: 2,
        address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        networkId: 2,
        lastSynced: new Date('2022-05-27T15:18:42.000Z'),
        paybuttons: [
          {
            paybuttonId: 'bfe90b48-b1f4-11ed-b556-0242ac120003',
            addressId: 2,
            createdAt: new Date('2022-05-27T15:18:42.000Z'),
            updatedAt: new Date('2022-05-27T15:18:42.000Z'),
            paybutton: {
              id: 'bfe90b48-b1f4-11ed-b556-0242ac120003',
              name: 'Mocked Paybutton 3',
              buttonData: '{}',
              providerUserId: 'dev-uid',
              createdAt: new Date('2022-05-27T15:18:42.000Z'),
              updatedAt: new Date('2022-05-27T15:18:42.000Z')
            }
          },
          {
            paybuttonId: 'bfe92acd-b1f4-11ed-b556-0242ac120003',
            addressId: 2,
            createdAt: new Date('2022-05-27T15:18:42.000Z'),
            updatedAt: new Date('2022-05-27T15:18:42.000Z'),
            paybutton: {
              id: 'bfe92acd-b1f4-11ed-b556-0242ac120003',
              name: 'Mocked Paybutton 4',
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
    id: 1,
    createdAt: new Date('2022-09-30T18:01:32.456Z'),
    updatedAt: new Date('2022-09-30T18:01:32.456Z'),
    name: 'mockedWallet',
    providerUserId: 'mocked-uid',
    userAddresses: []
  },
  {
    id: 2,
    createdAt: new Date('2022-09-30T18:01:32.456Z'),
    updatedAt: new Date('2022-09-30T18:01:32.456Z'),
    name: 'mockedWallet2',
    providerUserId: 'mocked-uid',
    userAddresses: []
  }
]

export const mockedWalletsOnUserProfile = {
  walletId: 1,
  userProfileId: 1,
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
export const mockedPriceOnTransaction = {
  priceId: 1,
  transactionId: 1,
  createdAt: new Date('2022-11-02T15:18:42.000Z'),
  updatedAt: new Date('2022-11-02T15:18:42.000Z'),
  price: {
    id: 1,
    value: new Prisma.Decimal('0.00001759'),
    createdAt: new Date('2022-11-02T15:18:42.000Z'),
    updatedAt: new Date('2022-11-02T15:18:42.000Z'),
    timestamp: 1606632380,
    networkId: 1,
    quoteId: 1
  }
}

export const mockedTransaction = {
  id: 1,
  hash: 'Yh5DRDjd3AarAvQA1nwpPI4daDihY6hQfnMV6UKFqZc=',
  addressId: 1,
  confirmed: true,
  address: {
    id: 1,
    address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
    createdAt: new Date('2022-11-02T15:18:42.000Z'),
    updatedAt: new Date('2022-11-02T15:18:42.000Z'),
    networkId: 1,
    walletId: 1
  },
  amount: new Prisma.Decimal('4.31247724'),
  timestamp: 1657130467,
  prices: [
    mockedPriceOnTransaction
  ]
}

export const mockedTransactionList = [
  {
    id: 1,
    hash: 'Yh5DRDjd3AarAvQA1nwpPI4daDihY6hQfnMV6UKFqZc=',
    confirmed: true,
    addressId: 1,
    amount: new Prisma.Decimal('4.31247724'),
    timestamp: 1657130467
  },
  {
    id: 2,
    hash: 'hh5DRDjd3AarAvQA1nwpPI4daDihY6hQfnMV6UKFqZc=',
    confirmed: true,
    addressId: 1,
    amount: new Prisma.Decimal('1.5'),
    timestamp: 1657130467
  },
  {
    id: 3,
    hash: '5h5DRDjd3AarAvQA1nwpPI4daDihY6hQfnMV6UKFqZc=',
    confirmed: true,
    addressId: 1,
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
