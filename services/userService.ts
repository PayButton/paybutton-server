import { UserProfile } from '@prisma/client'
import supertokens from 'supertokens-node'
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
  stUser: SupertokensUser
}

export async function fetchUserListFromSupertokensDB (idList: string[]): Promise<SupertokensUser[]> {
  const allSTUsers = await supertokens.getUsersNewestFirst({ tenantId: 'public' })
  const users = allSTUsers.users.filter(u => idList.includes(u.user.id))
  if (users.length === 0) {
    return []
  }
  return users.map(u => u.user)
}

export async function fetchUserFromSupertokensDB (id: string): Promise<SupertokensUser> {
  const allSTUsers = await supertokens.getUsersNewestFirst({ tenantId: 'public' })
  const user = allSTUsers.users.find(u => u.user.id === id)
  if (user === undefined) {
    throw new Error(RESPONSE_MESSAGES.NO_USER_FOUND_404.message)
  }
  return user.user
}

export async function fetchAllUsersWithSupertokens (): Promise<UserWithSupertokens[]> {
  const ret: UserWithSupertokens[] = []
  const userProfiles = await fetchAllUsers()
  const stUsers = (await supertokens.getUsersNewestFirst({ tenantId: 'public' })).users.map(u => u.user)
  for (const userProfile of userProfiles) {
    ret.push({
      userProfile,
      stUser: stUsers.find(u => u.id === userProfile.id)
    })
  }
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

export async function getUserSecretKey (id: string): Promise<string> {
  const secretKey = process.env.MASTER_SECRET_KEY as string
  return crypto.createHash('sha256').update(secretKey + id).digest('hex')
}

export async function fetchAllUsers (): Promise<UserProfile[]> {
  return await prisma.userProfile.findMany()
}

export async function isUserAdmin (id: string): Promise<boolean> {
  const user = await prisma.userProfile.findFirst({
    where: {
      id
    }
  })

  return user?.isAdmin === true
}
