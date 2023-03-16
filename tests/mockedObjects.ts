import { Prisma, Price } from '@prisma/client'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { WalletWithAddressesWithPaybuttons } from 'services/walletService'
import { USD_QUOTE_ID, CAD_QUOTE_ID, XEC_NETWORK_ID, NETWORK_SLUGS } from 'constants/index'
import { Tx } from 'chronik-client'

export const mockedPaybutton: PaybuttonWithAddresses = {
  id: 4,
  providerUserId: 'mocked-uid',
  name: 'mocked-name',
  buttonData: 'mockedData',
  uuid: '730bfa24-eb57-11ec-b722-0242ac150002',
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
  paybuttonId: 1,
  walletId: null
}

export const mockedXECAddress = {
  id: 1,
  address: 'ecash:qrmm7edwuj4jf7tnvygjyztyy0a0qxvl7quss2vxek',
  createdAt: new Date('2022-05-27T15:18:42.000Z'),
  updatedAt: new Date('2022-05-27T15:18:42.000Z'),
  lastSynced: null,
  networkId: 1,
  paybuttonId: 1,
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
        paybuttonId: 1,
        addressId: 1,
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        paybutton: {
          id: 1,
          name: 'Mocked Paybutton 1',
          uuid: 'bfe90894-b1f4-11ed-b556-0242ac120003',
          buttonData: '{"example": "value"}',
          providerUserId: 'dev-uid',
          createdAt: new Date('2022-05-27T15:18:42.000Z'),
          updatedAt: new Date('2022-05-27T15:18:42.000Z')
        }
      },
      {
        paybuttonId: 3,
        addressId: 1,
        createdAt: new Date('2022-05-27T15:18:42.000Z'),
        updatedAt: new Date('2022-05-27T15:18:42.000Z'),
        paybutton: {
          id: 3,
          name: 'Mocked Paybutton 2',
          uuid: 'bfe92acd-b1f4-11ed-b556-0242ac120003',
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
    id: 1,
    providerUserId: 'mocked-uid',
    name: 'mocked-name-1',
    buttonData: 'mockedData',
    uuid: '730bfa24-eb57-11ec-b722-0242ac150002',
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
    id: 2,
    providerUserId: 'mocked-uid',
    name: 'mocked-name-2',
    buttonData: 'mockedData',
    uuid: '133fb8aa-eb57-11ec-b722-0242ac150002',
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
            paybuttonId: 1,
            addressId: 1,
            createdAt: new Date('2022-05-27T15:18:42.000Z'),
            updatedAt: new Date('2022-05-27T15:18:42.000Z'),
            paybutton: {
              id: 1,
              name: 'Mocked Paybutton 1',
              uuid: 'bfe90894-b1f4-11ed-b556-0242ac120003',
              buttonData: '{"example": "value"}',
              providerUserId: 'dev-uid',
              createdAt: new Date('2022-05-27T15:18:42.000Z'),
              updatedAt: new Date('2022-05-27T15:18:42.000Z')
            }
          },
          {
            paybuttonId: 3,
            addressId: 1,
            createdAt: new Date('2022-05-27T15:18:42.000Z'),
            updatedAt: new Date('2022-05-27T15:18:42.000Z'),
            paybutton: {
              id: 3,
              name: 'Mocked Paybutton 2',
              uuid: 'bfe92acd-b1f4-11ed-b556-0242ac120003',
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
            paybuttonId: 2,
            addressId: 2,
            createdAt: new Date('2022-05-27T15:18:42.000Z'),
            updatedAt: new Date('2022-05-27T15:18:42.000Z'),
            paybutton: {
              id: 2,
              name: 'Mocked Paybutton 3',
              uuid: 'bfe90b48-b1f4-11ed-b556-0242ac120003',
              buttonData: '{}',
              providerUserId: 'dev-uid',
              createdAt: new Date('2022-05-27T15:18:42.000Z'),
              updatedAt: new Date('2022-05-27T15:18:42.000Z')
            }
          },
          {
            paybuttonId: 3,
            addressId: 2,
            createdAt: new Date('2022-05-27T15:18:42.000Z'),
            updatedAt: new Date('2022-05-27T15:18:42.000Z'),
            paybutton: {
              id: 3,
              name: 'Mocked Paybutton 4',
              uuid: 'bfe92acd-b1f4-11ed-b556-0242ac120003',
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

export const mockedBlockchainTransactions: Tx[] = [
  {
    txid: '0d5a7564e2a9772620603c1b185343a3772577b66c037f388df42427c516af93',
    version: 2,
    inputs: [
      {
        prevOut: {
          txid: 'ee19a9b6736be645330364ec4e04d5f2220344a8cec9ef7f7edc1cf59e6378d0',
          outIdx: 1
        },
        inputScript: '473044022004e8fddb7df4832b935ac7b9b92e146b6e79eefc15c78230be2f5ff09de132ff02207d2e0e578b9eec8b805d81d18f0a4332211b2136c1915e35652e5d9f9e97614141210309ff271f1b185911a34b5dc184af39a9ff8b513f9689d9d1d541c9274df72e41',
        outputScript: '76a914568be1580596a355f1ae5c4dfaa317fae204920588ac',
        value: '3321349',
        sequenceNo: 4294967295,
        slpBurn: undefined,
        slpToken: undefined
      }
    ],
    outputs: [
      {
        value: '2468',
        outputScript: '76a914f7bf65aee4ab24f973611122096423faf0199ff088ac',
        slpToken: undefined,
        spentBy: undefined
      },
      {
        value: '3318604',
        outputScript: '76a914b175a25dda930d1d7c9a11243125bf9852718f6888ac',
        spentBy: {
          txid: '126480c2029c6fd7ade179751ab5e21b41190848710c527fbd8b9f279079b26e',
          outIdx: 0
        },
        slpToken: undefined
      }
    ],
    lockTime: 0,
    block: {
      height: 679416,
      hash: '0000000000000000540035c8cdc5e88bd771209c24e6b5161348952893b50dda',
      timestamp: '1616902919'
    },
    timeFirstSeen: '0',
    size: 225,
    isCoinbase: false,
    network: 'XEC',
    slpErrorMsg: undefined,
    slpTxData: undefined
  }, {
    txid: 'bd56e6aaa8aa71e5239ec89fef8ddb7b91e9cf5a321102232967046f94ee0be9',
    version: 2,
    inputs: [
      {
        prevOut: {
          txid: '7e7ea1252c734a3045961279262b68d12efba6f2a8c569cb798789728992f0c7',
          outIdx: 1
        },
        inputScript: '483045022100895e389c4ce9322fa4b203bf6e90e23604ff58c125625d02b7ecd8b79524796702204eed994ba836befec6dbe81f5aa874ffa5b8e5d0f30ea7c767b3a5ae0ecb624d412102fa58bffe6400c7fb67b73e8ba1816e679dc92fbfe620eb3ce52fc2cef20b54a3',
        outputScript: '76a914f78b43e81de78912d1ef639f459495179798f06588ac',
        value: '3339802',
        sequenceNo: 4294967295,
        slpBurn: undefined,
        slpToken: undefined
      }
    ],
    outputs: [
      {
        value: '2168',
        outputScript: '76a914f7bf65aee4ab24f973611122096423faf0199ff088ac',
        slpToken: undefined,
        spentBy: undefined
      },
      {
        value: '3337357',
        outputScript: '76a914a411c0874257abd92b4966b258a2507c21a4dcb288ac',
        spentBy: {
          txid: '39975eaab8d7142a68c5d34e8a97262fc2746490dc31b104a3f9dccb1e338ce5',
          outIdx: 0
        },
        slpToken: undefined
      }
    ],
    lockTime: 0,
    block: {
      height: 675308,
      hash: '0000000000000000656d5ce75f625d823b9a0c7840a0c353b47d742ff0935876',
      timestamp: '1614551234'
    },
    timeFirstSeen: '0',
    size: 226,
    isCoinbase: false,
    network: 'XEC',
    slpErrorMsg: undefined,
    slpTxData: undefined
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
