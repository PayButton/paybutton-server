import { UserProfile } from '@prisma/client'
import supertokens from 'supertokens-node/recipe/thirdpartyemailpassword'
import { RESPONSE_MESSAGES } from 'constants/index'
import prisma from 'prisma/clientInstance'
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
  return {
    userProfile,
    stUser: await supertokens.getUserById(userProfile.id)
  }
}

export async function fetchAllUsersWithSupertokens (): Promise<UserWithSupertokens[]> {
  const ret: UserWithSupertokens[] = []
  const userProfiles = await fetchAllUsers()
  await Promise.all(userProfiles.map(async (userProfile) =>
    ret.push({
      userProfile,
      stUser: await supertokens.getUserById(userProfile.id)
    })
  ))
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
