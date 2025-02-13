import EmailPassword from 'supertokens-node/recipe/emailpassword'
import SessionNode from 'supertokens-node/recipe/session'
import { appInfo } from './appInfo'
import { TypeInput } from 'supertokens-node/types'
import * as walletService from 'services/walletService'
import EmailVerification from 'supertokens-node/recipe/emailverification'
import Dashboard from 'supertokens-node/recipe/dashboard'

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
      EmailPassword.init({
        override: {
          apis: (originalImplementation) => {
            return {
              ...originalImplementation,

              // override the email password sign up API
              signUpPOST: async function (input) {
                if (originalImplementation.signUpPOST === undefined) {
                  throw Error('Should never come here')
                }
                // pre sign up logic goes here

                const response = await originalImplementation.signUpPOST(input)

                if (response.status === 'OK') {
                  void walletService.createDefaultWalletForUser(response.user.id)
                  // post sign up logic goes here
                }

                return response
              },

              // override the email password sign in API
              signInPOST: async function (input) {
                if (originalImplementation.signInPOST === undefined) {
                  throw Error('Should never come here')
                }
                // pre sign in logic goes here

                const response = await originalImplementation.signInPOST(input)

                if (response.status === 'OK') {
                  // post sign in logic goes here
                }
                return response
              }
            }
          }
        }
      }),
      SessionNode.init(),
      EmailVerification.init({
        mode: 'REQUIRED'
      }),
      Dashboard.init()
    ],
    isInServerlessEnv: true
  }
}
