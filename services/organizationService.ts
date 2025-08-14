import { Organization, OrganizationInvite, UserProfile } from '@prisma/client'
import config from 'config'
import { RESPONSE_MESSAGES } from 'constants/index'
import prisma from 'prisma-local/clientInstance'
import { CreateOrganizationInput, UpdateOrganizationInput } from 'utils/validators'

export async function createOrganization ({ creatorId, name }: CreateOrganizationInput): Promise<Organization> {
  return await prisma.organization.create({
    data: {
      creatorId,
      name,
      users: {
        connect: {
          id: creatorId
        }
      },
      address: ''
    }
  })
}

export async function fetchInviteForToken (token: string): Promise<OrganizationInvite> {
  return await prisma.organizationInvite.findUniqueOrThrow({
    where: {
      token
    }
  })
}

export async function fetchAllOrganizationInvitesForUser (userId: string): Promise<OrganizationInvite[]> {
  return await prisma.organizationInvite.findMany({
    where: {
      organization: {
        creatorId: userId
      },
      usedBy: ''
    }
  })
}

export async function fetchOrganizationForUser (userId: string): Promise<Organization | null> {
  return (await prisma.userProfile.findUniqueOrThrow({
    where: {
      id: userId
    },
    select: {
      organization: true
    }
  })).organization
}

export async function fetchOrganization (id: string): Promise<Organization> {
  return await prisma.organization.findFirstOrThrow({
    where: {
      id
    }
  })
}

export async function deleteOrganization (organizationId: string, userId: string): Promise<void> {
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, creatorId: userId },
    include: { users: true }
  })

  if (organization == null) {
    throw new Error(RESPONSE_MESSAGES.USER_HAS_NO_ORGANIZATION_400.message)
  }

  await prisma.organization.delete({
    where: { id: organizationId }
  })
}

export async function updateOrganization ({ userId, name, address }: UpdateOrganizationInput): Promise<Organization> {
  const organization = await prisma.organization.findFirst({
    where: { creatorId: userId }
  })

  if (organization == null) {
    throw new Error(RESPONSE_MESSAGES.USER_HAS_NO_ORGANIZATION_400.message)
  }

  const updateData: Partial<Organization> = {}

  if (name !== undefined && name !== '') updateData.name = name
  if (address !== undefined && address !== '') updateData.address = address

  return await prisma.organization.update({
    where: { id: organization.id },
    data: updateData
  })
}

const generateTokenForUser = (): string => {
  let hexString = ''
  for (let i = 0; i < 32; i++) {
    hexString += Math.floor(Math.random() * 16).toString(16)
  }
  return hexString
}

export async function createOrganizationInviteForUser (userId: string): Promise<OrganizationInvite> {
  const organization = (await prisma.userProfile.findFirstOrThrow({
    where: {
      id: userId
    },
    select: {
      organization: true
    }
  })).organization
  if (organization === null) {
    throw new Error(RESPONSE_MESSAGES.USER_HAS_NO_ORGANIZATION_400.message)
  }

  return await prisma.organizationInvite.create({
    data: {
      organizationId: organization.id,
      usedBy: '',
      token: generateTokenForUser()
    }
  })
}

export const getUrlFromToken = (token: string): string => {
  return `${config.websiteDomain}/organization/join/${token}`
}

const throwIfInviteUsed = (invite: OrganizationInvite, userId: string): void => {
  switch (invite.usedBy) {
    case '':
      break
    case userId:
      throw new Error(RESPONSE_MESSAGES.USER_HAS_ALREADY_USED_INVITE_400.message)
    default:
      throw new Error(RESPONSE_MESSAGES.INVALID_INVITE_400.message)
  }
}

const throwIfInviteExpired = (invite: OrganizationInvite): void => {
  const now = new Date()
  const oneDayInMs = 24 * 60 * 60 * 1000 // 1 day in milliseconds

  if (now.getTime() - invite.updatedAt.getTime() > oneDayInMs) {
    throw new Error(RESPONSE_MESSAGES.INVITE_EXPIRED_400.message)
  }
}

export const joinOrganization = async (userId: string, token: string): Promise<void> => {
  const invite = await fetchInviteForToken(token)
  const userOrg = await fetchOrganizationForUser(userId)

  throwIfInviteExpired(invite)
  throwIfInviteUsed(invite, userId)
  if (userOrg !== null) {
    throw new Error(RESPONSE_MESSAGES.USER_ALREADY_HAS_ORGANIZATION_400.message)
  }

  await prisma.$transaction([
    prisma.userProfile.update({
      where: {
        id: userId
      },
      data: {
        organization: {
          connect: {
            id: invite.organizationId
          }
        }
      }
    }),
    prisma.organizationInvite.update({
      where: {
        id: invite.id
      },
      data: {
        usedBy: userId
      }
    })

  ])
}

export const refreshInvite = async (id: string): Promise<void> => {
  await prisma.organizationInvite.update({
    where: {
      id
    },
    data: { updatedAt: new Date() }
  })
}

export const leaveOrganization = async (userId: string): Promise<void> => {
  const org = await fetchOrganizationForUser(userId)

  if (org === null) {
    throw new Error(RESPONSE_MESSAGES.USER_ALREADY_HAS_ORGANIZATION_400.message)
  }
  await prisma.userProfile.update({
    where: {
      id: userId
    },
    data: {
      organization: {
        disconnect: true
      }
    }
  })
}

export const fetchOrganizationMembers = async (organizationId: string): Promise<UserProfile[]> => {
  return await prisma.userProfile.findMany({
    where: {
      organizationId
    }
  })
}
