import { Prisma, Address } from '@prisma/client'
import prisma from 'prisma/clientInstance'
import { RESPONSE_MESSAGES } from 'constants/index'
import { fetchAddressTransactions } from 'services/transactionService'
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

export async function fetchAddressBySubstring (substring: string): Promise<AddressWithTransactionsAndNetwork> {
  const results = await prisma.address.findMany({
    where: {
      address: {
        contains: substring
      }
    },
    include: {
      network: true,
      transactions: true
    }
  })
  if (results.length === 0) throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message)
  return results[0]
}

export async function addressExists (addressString: string, raise = false): Promise<boolean> {
  try {
    await prisma.address.findUniqueOrThrow({
      where: {
        address: addressString
      }
    })
  } catch (err: any) {
    if (raise) {
      throw new Error(RESPONSE_MESSAGES.NO_ADDRESS_FOUND_404.message)
    }
    return false
  }
  return true
}

// WIP
export async function fetchAllUserAddressStrings (userId: string): Promise<string[]> {
  return (await prisma.address.findMany({
    where: {
      paybuttons: {
        some: {
          paybutton: {
            providerUserId: userId
          }
        }
      }
    }
  })
  ).map(a => a.address)
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

export async function fetchAddressesArray (prefixedAddressList: string[]): Promise<AddressWithTransactionsAndNetwork[]> {
  return await prisma.address.findMany({
    where: {
      address: {
        in: prefixedAddressList
      }
    },
    include: {
      network: true,
      transactions: true
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
  const transactionsAmounts = (await fetchAddressTransactions(addressString)).map((t) => t.amount)
  const balance = transactionsAmounts.reduce((a, b) => {
    return a.plus(b)
  }, new Prisma.Decimal(0))
  const zero = new Prisma.Decimal(0)
  const paymentCount = transactionsAmounts.filter(t => t > zero).length
  const info = {
    balance,
    paymentCount
  }
  return info
}

export async function getLatestTxTimestampForAddress (addressId: string): Promise<number | undefined> {
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

export async function updateLastSynced (addressString: string): Promise<void> {
  await prisma.address.update({
    where: {
      address: addressString
    },
    data: {
      lastSynced: new Date()
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
