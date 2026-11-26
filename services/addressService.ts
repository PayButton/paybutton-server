import { Prisma, Address } from '@prisma/client'
import prisma from 'prisma-local/clientInstance'
import { RESPONSE_MESSAGES, ADDRESS_ACTIVITY_TOUCH_THROTTLE } from 'constants/index'
import config from 'config'
import { getNetworkFromSlug } from 'services/networkService'

const addressWithTransactionAndNetwork = Prisma.validator<Prisma.AddressDefaultArgs>()({
  include: { transactions: true, network: true }
})
type AddressWithTransactionsAndNetwork = Prisma.AddressGetPayload<typeof addressWithTransactionAndNetwork>

const addressWithTransactions = Prisma.validator<Prisma.AddressDefaultArgs>()({
  include: { transactions: true }
})

export type AddressWithTransactions = Prisma.AddressGetPayload<typeof addressWithTransactions>

const addressWithTransactionsWithPrices = Prisma.validator<Prisma.AddressDefaultArgs>()({
  include: {
    transactions: {
      include: {
        prices: {
          include: {
            price: true
          }
        }
      }
    }
  }
})

export type AddressWithTransactionsWithPrices = Prisma.AddressGetPayload<typeof addressWithTransactionsWithPrices>

const addressWithUserProfiles = Prisma.validator<Prisma.AddressDefaultArgs>()({
  include: {
    userProfiles: {
      include: {
        userProfile: true
      }
    }
  }
})

export type AddressWithUserProfiles = Prisma.AddressGetPayload<typeof addressWithUserProfiles>

export const includePaybuttonsNested = {
  paybuttons: {
    include: {
      paybutton: true
    }
  }
}

const addressWithPaybuttons = Prisma.validator<Prisma.AddressDefaultArgs>()({
  include: includePaybuttonsNested
})

export function includeUserPaybuttonsNested (userId: string): Prisma.AddressInclude {
  return {
    paybuttons: {
      include: {
        paybutton: true
      },
      where: {
        paybutton: {
          providerUserId: userId
        }
      }
    }
  }
}

export type AddressWithPaybuttons = Prisma.AddressGetPayload<typeof addressWithPaybuttons>

const addressWithPaybuttonsAndUserProfiles = Prisma.validator<Prisma.AddressDefaultArgs>()({
  include: {
    ...includePaybuttonsNested,
    userProfiles: {
      include: {
        userProfile: true
      }
    }
  }
})

export type AddressWithPaybuttonsAndUserProfiles = Prisma.AddressGetPayload<typeof addressWithPaybuttonsAndUserProfiles>

const addressWithTransactionsAndPaybuttons = Prisma.validator<Prisma.AddressDefaultArgs>()({
  include: { transactions: true, paybuttons: includePaybuttonsNested.paybuttons }
})

export type AddressWithTransactionsAndPaybuttons = Prisma.AddressGetPayload<typeof addressWithTransactionsAndPaybuttons>

const includeTransactionNetworkUserProfile = {
  include: {
    transactions: true,
    network: true,
    userProfiles: {
      include: {
        userProfile: true
      }
    }
  }
}

const addressWithTransactionNetworkUserProfile = Prisma.validator<Prisma.AddressDefaultArgs>()(
  includeTransactionNetworkUserProfile
)
export type AddressWithTransactionNetworkUserProfile = Prisma.AddressGetPayload<typeof addressWithTransactionNetworkUserProfile>

export async function fetchAddressBySubstring (substring: string, includeTransactions = false): Promise<AddressWithTransactionsAndNetwork> {
  const results = await prisma.address.findMany({
    where: {
      address: {
        contains: substring
      }
    },
    include: {
      network: true,
      transactions: includeTransactions
    }
  })
  if (results.length === 0) throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message)
  return results[0]
}

export async function addressExists (addressString: string, raise = false): Promise<boolean> {
  const address = await prisma.address.findUnique({
    where: {
      address: addressString
    },
    select: {
      id: true
    }
  })
  if (address === null) {
    if (raise) {
      throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message)
    }
    return false
  }
  return true
}

export async function fetchAllUserAddresses (userId: string, includeTransactions = false, includePaybuttons = false): Promise<
Address[]
| AddressWithTransactionsWithPrices[]
| AddressWithPaybuttons[]
| AddressWithTransactionsAndPaybuttons[]> {
  return await prisma.address.findMany({
    where: {
      paybuttons: {
        some: {
          paybutton: {
            providerUserId: userId
          }
        }
      }
    },
    include: {
      transactions: includeTransactions ? addressWithTransactionsWithPrices.include.transactions : false,
      paybuttons: includePaybuttons ? includeUserPaybuttonsNested(userId).paybuttons : false
    }
  })
}

export async function fetchAllAddresses (includeTransactions = false): Promise<AddressWithTransactions[]> {
  return await prisma.address.findMany({
    include: {
      transactions: includeTransactions
    }
  })
}

export async function fetchUnsyncedAddresses (): Promise<Address[]> {
  return await prisma.address.findMany({
    where: {
      lastSynced: null
    }
  })
}

export async function fetchAllAddressesForNetworkId (networkId: number): Promise<Address[]> {
  return await prisma.address.findMany({
    where: {
      networkId
    }
  })
}

/**
 * Addresses with no activity since this date are expired: they are left out of
 * the startup sync and the chronik subscription until something touches them.
 * Undefined when expiry is disabled (config.addressExpiryDays = 0).
 */
export function getAddressExpiryCutoff (): Date | undefined {
  if (config.addressExpiryDays <= 0) return undefined
  return new Date(Date.now() - config.addressExpiryDays * 24 * 60 * 60 * 1000)
}

export function isAddressExpired (address: Pick<Address, 'lastActivityAt'>): boolean {
  const cutoff = getAddressExpiryCutoff()
  return cutoff !== undefined && address.lastActivityAt < cutoff
}

export async function fetchActiveAddressesForNetworkId (networkId: number): Promise<Address[]> {
  const cutoff = getAddressExpiryCutoff()
  if (cutoff === undefined) return await fetchAllAddressesForNetworkId(networkId)
  return await prisma.address.findMany({
    where: {
      networkId,
      lastActivityAt: { gte: cutoff }
    }
  })
}

export async function fetchExpiredAddressesForNetworkId (networkId: number): Promise<Address[]> {
  const cutoff = getAddressExpiryCutoff()
  if (cutoff === undefined) return []
  return await prisma.address.findMany({
    where: {
      networkId,
      lastActivityAt: { lt: cutoff }
    }
  })
}

// Addresses a user owns, through their paybuttons or wallets.
function userAddressesWhere (userId: string): Prisma.AddressWhereInput {
  return {
    OR: [
      { paybuttons: { some: { paybutton: { providerUserId: userId } } } },
      { userProfiles: { some: { userId } } }
    ]
  }
}

export async function fetchExpiredUserAddresses (userId: string): Promise<Address[]> {
  const cutoff = getAddressExpiryCutoff()
  if (cutoff === undefined) return []
  return await prisma.address.findMany({
    where: {
      ...userAddressesWhere(userId),
      lastActivityAt: { lt: cutoff }
    }
  })
}

// Same throttling as touchAddressActivity.
export async function touchUserAddressesActivity (userId: string): Promise<void> {
  const now = new Date()
  await prisma.address.updateMany({
    where: {
      ...userAddressesWhere(userId),
      lastActivityAt: { lt: new Date(now.getTime() - ADDRESS_ACTIVITY_TOUCH_THROTTLE) }
    },
    data: { lastActivityAt: now }
  })
}

export async function fetchAddressesByIdList (addressIds: string[]): Promise<Address[]> {
  return await prisma.address.findMany({
    where: { id: { in: addressIds } }
  })
}

/**
 * Records activity on the addresses (by id). Skips the write for addresses
 * touched within ADDRESS_ACTIVITY_TOUCH_THROTTLE, so frequent lookups stay cheap.
 */
export async function touchAddressActivity (addressIds: string[]): Promise<void> {
  if (addressIds.length === 0) return
  const now = new Date()
  await prisma.address.updateMany({
    where: {
      id: { in: [...new Set(addressIds)] },
      lastActivityAt: { lt: new Date(now.getTime() - ADDRESS_ACTIVITY_TOUCH_THROTTLE) }
    },
    data: { lastActivityAt: now }
  })
}

export async function fetchAddressesArray (prefixedAddressList: string[], includeTransactions = false): Promise<AddressWithTransactionsAndNetwork[]> {
  return await prisma.address.findMany({
    where: {
      address: {
        in: prefixedAddressList
      }
    },
    include: {
      network: true,
      transactions: includeTransactions
    }
  })
}

export async function upsertAddress (
  addressString: string,
  prismaTransaction?: Prisma.TransactionClient,
  includeTransactions = false
): Promise<AddressWithTransactions> {
  const prefix = addressString.split(':')[0].toLowerCase()
  const network = await getNetworkFromSlug(prefix)
  const localPrisma = prismaTransaction ?? prisma
  return await localPrisma.address.upsert({
    where: {
      address: addressString
    },
    create: {
      address: addressString.toLowerCase(),
      networkId: Number(network.id)
    },
    update: {
    },
    include: { transactions: includeTransactions }
  })
}

export interface AddressPaymentInfo {
  balance: Prisma.Decimal
  paymentCount: number
}

export async function generateAddressPaymentInfo (addressString: string): Promise<AddressPaymentInfo> {
  const address = await fetchAddressBySubstring(addressString)
  const [balanceResult, paymentCount] = await Promise.all([
    prisma.transaction.aggregate({
      where: { addressId: address.id },
      _sum: { amount: true }
    }),
    prisma.transaction.count({
      where: { addressId: address.id, amount: { gt: 0 } }
    })
  ])
  return {
    balance: balanceResult._sum.amount ?? new Prisma.Decimal(0),
    paymentCount
  }
}
export async function getEarliestUnconfirmedTxTimestampForAddress (addressId: string): Promise<number | undefined> {
  const tx = await prisma.transaction.findFirst({
    where: {
      addressId,
      confirmed: false
    },
    orderBy: {
      timestamp: 'asc'
    },
    select: {
      timestamp: true
    }
  })
  return tx?.timestamp
}

export async function getLatestConfirmedTxTimestampForAddress (addressId: string): Promise<number | undefined> {
  const tx = await prisma.transaction.findFirst({
    where: {
      addressId,
      confirmed: true
    },
    orderBy: {
      timestamp: 'desc'
    },
    select: {
      timestamp: true
    }
  })
  return tx?.timestamp
}

export async function updateLastSynced (addressString: string, timestampSeconds: number): Promise<void> {
  await prisma.address.update({
    where: {
      address: addressString
    },
    data: {
      syncing: false,
      lastSynced: new Date(timestampSeconds * 1000)
    }
  })
}

export async function fetchAddressById (addressId: string, includePaybuttons = false): Promise<AddressWithPaybuttons | Address> {
  const result = await prisma.address.findUnique({
    where: {
      id: addressId
    },
    include: {
      paybuttons: includePaybuttons ? includePaybuttonsNested.paybuttons : false
    }
  })
  if (result === null) {
    throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message)
  }
  return result
}

export async function setSyncingBatch (addressStringArray: string[], syncing: boolean): Promise<void> {
  await prisma.address.updateMany({
    where: {
      address: {
        in: addressStringArray
      }
    },
    data: {
      syncing
    }
  })
}

export async function setSyncing (addressString: string, syncing: boolean): Promise<void> {
  const result = await prisma.address.update({
    where: {
      address: addressString
    },
    data: {
      syncing
    }
  })
  if (result === null) {
    throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message)
  }
}

export async function fetchAddressWithTxsAndPrices (addressString: string): Promise<AddressWithTransactionsWithPrices> {
  const result = await prisma.address.findUnique({
    where: {
      address: addressString
    },
    include: addressWithTransactionsWithPrices.include
  })
  if (result === null) {
    throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message)
  }
  return result
}

export async function fetchAddressesByPaybuttonId (paybuttonId: string): Promise<string[]> {
  const addresses = await prisma.addressesOnButtons.findMany({
    where: {
      paybuttonId
    }
  })
  const addressesIds = addresses.map(result => result.addressId)

  if (addressesIds.length === 0) {
    throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message)
  }

  return addressesIds
}
