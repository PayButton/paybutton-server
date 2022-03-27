import ThirdPartyEmailPasswordNode from 'supertokens-node/recipe/thirdpartyemailpassword'
import SessionNode from 'supertokens-node/recipe/session'
import { appInfo } from './appInfo'
import { TypeInput } from 'supertokens-node/types'
export let backendConfig = () : TypeInput => {
  return {
    framework: 'express',
    supertokens: {
      connectionURI: 'https://try.supertokens.io',
    },
    appInfo,
    recipeList: [
      ThirdPartyEmailPasswordNode.init({
        providers: [
          ThirdPartyEmailPasswordNode.Github({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET
          }),
          ThirdPartyEmailPasswordNode.Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
          ThirdPartyEmailPasswordNode.Facebook({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET
          }),
          ThirdPartyEmailPasswordNode.Apple({
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: {
                keyId: process.env.APPLE_KEY_ID,
                privateKey: process.env.APPLE_PRIVATE_KEY,
                teamId: process.env.APPLE_TEAM_ID
            },
          }),
        ],
      }),
      SessionNode.init(),
    ],
    isInServerlessEnv: true,
  }
}
