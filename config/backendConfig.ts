import ThirdPartyEmailPasswordNode from 'supertokens-node/recipe/thirdpartyemailpassword'
import SessionNode from 'supertokens-node/recipe/session'
import { appInfo } from './appInfo'
import { TypeInput } from 'supertokens-node/types'
import * as walletService from 'services/walletService'

const getSocialLoginProviders = (): array => {
  const availableSocialProviders = {
    github: process.env.GITHUB_CLIENT_ID as boolean
      ? () =>
          ThirdPartyEmailPasswordNode.Github({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET
          })
      : false,
    google: process.env.GOOGLE_CLIENT_ID as boolean
      ? () =>
          ThirdPartyEmailPasswordNode.Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
          })
      : false,
    facebook: process.env.FACEBOOK_CLIENT_ID as boolean
      ? () =>
          ThirdPartyEmailPasswordNode.Facebook({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET
          })
      : false,
    apple: process.env.APPLE_CLIENT_ID as boolean
      ? () =>
          ThirdPartyEmailPasswordNode.Apple({
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: {
              keyId: process.env.APPLE_KEY_ID,
              privateKey: process.env.APPLE_PRIVATE_KEY,
              teamId: process.env.APPLE_TEAM_ID
            }
          })
      : false
  }

  const socialProviderNodes = Object.keys(availableSocialProviders).map(providerKey => {
    const getSocialProviderNode: Function | boolean = availableSocialProviders[providerKey]
    if (getSocialProviderNode !== false) {
      return getSocialProviderNode
    }
    return false
  })
  socialProviderNodes.filter(provider => provider !== false)
}

export const backendConfig = (): TypeInput => {
  let connectionURI: string = process.env.SUPERTOKENS_CONNECTION_URI

  if (connectionURI === undefined) {
    connectionURI = 'http://users-service:3567'
  }

  return {
    framework: 'express',
    supertokens: {
      apiKey: process.env.SUPERTOKENS_API_KEY,
      connectionURI
    },
    appInfo,
    recipeList: [
      ThirdPartyEmailPasswordNode.init({
        providers: getSocialLoginProviders(),
        override: {
          apis: (originalImplementation) => {
            return {
              ...originalImplementation,

              // override the email password sign up API
              emailPasswordSignUpPOST: async function (input) {
                if (originalImplementation.emailPasswordSignUpPOST === undefined) {
                  throw Error('Should never come here')
                }
                // pre sign up logic goes here

                const response = await originalImplementation.emailPasswordSignUpPOST(input)

                if (response.status === 'OK') {
                  void walletService.createDefaultWalletForUser(response.user.id)
                  // post sign up logic goes here
                }

                return response
              },

              // override the email password sign in API
              emailPasswordSignInPOST: async function (input) {
                if (originalImplementation.emailPasswordSignInPOST === undefined) {
                  throw Error('Should never come here')
                }
                // pre sign in logic goes here

                const response = await originalImplementation.emailPasswordSignInPOST(input)

                if (response.status === 'OK') {
                  // post sign in logic goes here
                  return response
                }
              },

              // override the thirdparty sign in / up API
              thirdPartySignInUpPOST: async function (input) {
                if (originalImplementation.thirdPartySignInUpPOST === undefined) {
                  throw Error('Should never come here')
                }
                // pre sign up logic goes here
                const response = await originalImplementation.thirdPartySignInUpPOST(input)

                if (response.status === 'OK') {
                  if (response.createdNewUser) {
                    // post sign up logic goes here
                    void walletService.createDefaultWalletForUser(response.user.id)
                  } else {
                    // post sign in logic goes here
                  }
                }

                return response
              }
            }
          }
        }
      }),
      SessionNode.init()
    ],
    isInServerlessEnv: true
  }
}
