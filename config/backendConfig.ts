import ThirdPartyEmailPasswordNode from 'supertokens-node/recipe/thirdpartyemailpassword'
import SessionNode from 'supertokens-node/recipe/session'
import { appInfo } from './appInfo'
import { TypeInput } from 'supertokens-node/types'
import * as walletService from 'services/walletService'

export const backendConfig = (): TypeInput => {
  let connectionURI: string | undefined = process.env.SUPERTOKENS_CONNECTION_URI

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
                }
                return response
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
