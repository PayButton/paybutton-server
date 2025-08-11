import { UserProfile } from '@prisma/client'
import supertokensNode from 'supertokens-node'
import { RESPONSE_MESSAGES } from 'constants/index'
import prisma from 'prisma-local/clientInstance'
import crypto from 'crypto'

export async function fetchUserProfileFromId (id: string): Promise<UserProfile> {
  const userProfile = await prisma.userProfile.findUnique({ where: { id } })
  if (userProfile === null) throw new Error(RESPONSE_MESSAGES.NO_USER_FOUND_404.message)
  return userProfile
}

export interface SupertokensUser {
  id: string
  timeJoined: number
  email: string
}

export interface UserWithSupertokens {
  userProfile: UserProfile
  stUser?: SupertokensUser
}

export async function fetchUserWithSupertokens (userId: string): Promise<UserWithSupertokens> {
  const userProfile = await fetchUserProfileFromId(userId)
  const stUser = await supertokensNode.getUser(userProfile.id)
  return {
    userProfile,
    stUser: stUser === undefined
      ? undefined
      : {
          id: stUser.id,
          timeJoined: stUser.timeJoined,
          email: stUser?.emails[0]
        }
  }
}

export async function fetchAllUsersWithSupertokens (): Promise<UserWithSupertokens[]> {
  const ret: UserWithSupertokens[] = []
  const userProfiles = await fetchAllUsers()
  await Promise.all(userProfiles.map(async (userProfile) => {
    const stUser = await supertokensNode.getUser(userProfile.id)
    ret.push({
      userProfile,
      stUser: stUser === undefined
        ? undefined
        : {
            id: stUser.id,
            timeJoined: stUser.timeJoined,
            email: stUser?.emails[0]
          }
    })
  }))
  return ret
}

export async function updateLastSentVerificationEmailAt (id: string): Promise<void> {
  await prisma.userProfile.update({
    where: { id },
    data: {
      lastSentVerificationEmailAt: new Date()
    }
  })
}

function getUserSeedHash (userId: string): Buffer {
  const secretKey = process.env.MASTER_SECRET_KEY as string
  return crypto.createHash('sha256').update(secretKey + userId).digest()
}

export function getUserPrivateKey (userId: string): crypto.KeyObject {
  const seed = getUserSeedHash(userId)
  const prefixPrivateEd25519 = Buffer.from('302e020100300506032b657004220420', 'hex')
  const der = Buffer.concat([prefixPrivateEd25519, seed])
  return crypto.createPrivateKey({ key: der, format: 'der', type: 'pkcs8' })
}

export async function getUserPublicKeyHex (id: string): Promise<string> {
  let userPublicKey = (
    await prisma.userProfile.findUniqueOrThrow({ where: { id }, select: { publicKey: true } })
  ).publicKey
  if (userPublicKey === '') {
    const privateKey = getUserPrivateKey(id)
    const publicKey = crypto.createPublicKey(privateKey).export({
      type: 'spki',
      format: 'der'
    }).toString('hex')

    await prisma.userProfile.update({
      where: {
        id
      },
      data: {
        publicKey
      }
    })
    userPublicKey = publicKey
  }
  return userPublicKey
}

export async function fetchAllUsers (): Promise<UserProfile[]> {
  return await prisma.userProfile.findMany()
}

export async function fetchUsersForAddress (addressString: string): Promise<UserProfile[]> {
  return await prisma.userProfile.findMany({
    where: {
      addresses: {
        some: {
          address: {
            address: addressString
          }
        }
      }
    }
  })
}

export async function isUserAdmin (id: string): Promise<boolean> {
  const user = await prisma.userProfile.findFirst({
    where: {
      id
    }
  })

  return user?.isAdmin === true
}

export const exportedForTesting = {
  getUserSeedHash
}

export async function updatePreferredCurrency (id: string, preferredCurrencyId: number): Promise<void> {
  await prisma.userProfile.update({
    where: { id },
    data: {
      preferredCurrencyId
    }
  })
}

export async function updatePreferredTimezone (id: string, preferredTimezone: string): Promise<void> {
  await prisma.userProfile.update({
    where: { id },
    data: {
      preferredTimezone
    }
  })
}

export async function userRemainingProTime (id: string): Promise<number | null> {
  const today = new Date()
  const proUntil = (await prisma.userProfile.findUniqueOrThrow({
    where: { id },
    select: {
      proUntil: true
    }
  })).proUntil
  if (proUntil === null) {
    return null
  }
  return proUntil.getTime() - today.getTime()
}
