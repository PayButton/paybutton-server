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

async function generateKeyPairForUser (userId: string): Promise<{
  privateKey: string
  publicKey: string
}> {
  // Create an elliptic curve Diffie-Hellman key exchange object using the prime256v1 curve
  const ecdh = crypto.createECDH('prime256v1')

  // Set the private key based on the hashed seed
  const seedHash = await getUserSeedHash(userId)
  ecdh.setPrivateKey(seedHash)

  // Generate the public key
  const publicKey = ecdh.generateKeys()

  // Convert keys to hex strings
  const privateKeyHex = ecdh.getPrivateKey().toString('hex')
  const publicKeyHex = publicKey.toString('hex')

  return { privateKey: privateKeyHex, publicKey: publicKeyHex }
}

export async function getUserPublicKey (id: string): Promise<string> {
  let userPublicKey = (
    await prisma.userProfile.findUniqueOrThrow({ where: { id }, select: { publicKey: true } })
  ).publicKey
  if (userPublicKey === '') {
    const { publicKey } = await generateKeyPairForUser(id)

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

export async function getUserSeedHash (userId: string): Promise<Buffer> {
  const secretKey = process.env.MASTER_SECRET_KEY as string
  return crypto.createHash('sha256').update(secretKey + userId).digest()
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
