import * as userService from 'services/userService'
import prisma from 'prisma-local/clientInstance'
import { prismaMock } from 'prisma-local/mockedClient'
import { mockedUserProfile, mockedUserProfileWithPublicKey } from 'tests/mockedObjects'

describe('seedHash is deterministic', () => {
  it('Gets seedHash deterministically for user 1', () => {
    const result = userService.exportedForTesting.getUserSeedHash('test-uid').toString('hex')
    expect(result).toEqual('cfa0ade843b078df83114ab9e0b3d56895c7c0ab2c634360550766a2eb34e3ac')
  })
  it('Gets seedHash deterministically for user 2', () => {
    const result = userService.exportedForTesting.getUserSeedHash('other-test-uid').toString('hex')
    expect(result).toEqual('95e5b48ea3779978659fd420843502ed2f13da6230fb4534dae163852d4f9802')
  })
})

describe('private key is deterministic', () => {
  it('Gets private key deterministically for user 1', () => {
    const result = userService.getUserPrivateKey('test-uid')
    const resultHex = result.export({
      type: 'pkcs8',
      format: 'der'
    }).toString('hex')
    expect(resultHex).toEqual('302e020100300506032b657004220420cfa0ade843b078df83114ab9e0b3d56895c7c0ab2c634360550766a2eb34e3ac')
  })
  it('Gets private key deterministically for user 2', () => {
    const result = userService.getUserPrivateKey('yet-another-test-uid')
    const resultHex = result.export({
      type: 'pkcs8',
      format: 'der'
    }).toString('hex')
    expect(resultHex).toEqual('302e020100300506032b65700422042023b26964155884dd64e63dcc43fad341b16e3d326bb17445813ccdfce71aa5b4')
  })
})

describe('public key is deterministic', () => {
  it('Gets unset public key deterministically for user 1', async () => {
    prismaMock.userProfile.findUniqueOrThrow.mockResolvedValue(mockedUserProfile)
    prisma.userProfile.findUniqueOrThrow = prismaMock.userProfile.findUniqueOrThrow

    prismaMock.userProfile.update.mockResolvedValue(mockedUserProfile)
    prisma.userProfile.update = prismaMock.userProfile.update

    const resultHex = await userService.getUserPublicKeyHex('user-id')
    expect(resultHex).toEqual('302a300506032b6570032100dccb484d5733c73156c77dbed1082928a2cad6048a32e979f577091ac86e76b9')
  })
  it('Gets already set public key deterministically for user 1', async () => {
    prismaMock.userProfile.findUniqueOrThrow.mockResolvedValue(mockedUserProfileWithPublicKey)
    prisma.userProfile.findUniqueOrThrow = prismaMock.userProfile.findUniqueOrThrow

    const resultHex = await userService.getUserPublicKeyHex('user-id')
    expect(resultHex).toEqual('mocked-already-set-public-key-1b3a0d9f')
  })
  it('Gets unset public key deterministically for user 2', async () => {
    prismaMock.userProfile.findUniqueOrThrow.mockResolvedValue(mockedUserProfile)
    prisma.userProfile.findUniqueOrThrow = prismaMock.userProfile.findUniqueOrThrow

    prismaMock.userProfile.update.mockResolvedValue(mockedUserProfile)
    prisma.userProfile.update = prismaMock.userProfile.update

    const resultHex = await userService.getUserPublicKeyHex('yet-another-test-uid')
    expect(resultHex).toEqual('302a300506032b65700321009da1949bc45732da6010583bdcb3781061c28661dc5e5f29b3c0a2d8e3decf8b')
  })
  it('Gets already set public key deterministically for user 2', async () => {
    prismaMock.userProfile.findUniqueOrThrow.mockResolvedValue(mockedUserProfileWithPublicKey)
    prisma.userProfile.findUniqueOrThrow = prismaMock.userProfile.findUniqueOrThrow

    const resultHex = await userService.getUserPublicKeyHex('yet-another-test-uid')
    expect(resultHex).toEqual('mocked-already-set-public-key-1b3a0d9f')
  })
})
