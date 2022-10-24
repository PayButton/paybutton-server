import { UserProfile } from '@prisma/client'
import prisma from 'prisma/clientInstance'

export async function fetchUserProfileByUserId (userId: string): Promise<UserProfile | null> {
  return await prisma.userProfile.findUnique({
    where: { userId }
  })
}
