import ThirdPartyEmailPasswordNode from 'supertokens-node/recipe/thirdpartyemailpassword'
import SessionNode from 'supertokens-node/recipe/session'
import { appInfo } from './appInfo'
import { TypeInput } from 'supertokens-node/types'

const getSocialLoginProviders = () => {
  const availableSocialProviders = {
   'github': process.env.GITHUB_CLIENT_ID ? () => 
          ThirdPartyEmailPasswordNode.Github({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET
          }) : false,
   'google': process.env.GOOGLE_CLIENT_ID ? () =>
          ThirdPartyEmailPasswordNode.Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }) : false,
   'facebook': process.env.FACEBOOK_CLIENT_ID ? () => 
          ThirdPartyEmailPasswordNode.Facebook({
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET
          }) : false,
   'apple': process.env.APPLE_CLIENT_ID ? () => 
          ThirdPartyEmailPasswordNode.Apple({
            clientId: process.env.APPLE_CLIENT_ID,
            clientSecret: {
                keyId: process.env.APPLE_KEY_ID,
                privateKey: process.env.APPLE_PRIVATE_KEY,
                teamId: process.env.APPLE_TEAM_ID
            },
          }) : false,
  }

  const socialProviderNodes = Object.keys(availableSocialProviders).map(providerKey => {
    const getSocialProviderNode = availableSocialProviders[providerKey]
    if (getSocialProviderNode) {
      return getSocialProviderNode()
    }
  })

  return socialProviderNodes.filter(provider => provider !== undefined)
}
export let backendConfig = () : TypeInput => {
  return {
    framework: 'express',
    supertokens: {
      apiKey: process.env.SUPERTOKENS_API_KEY,
      connectionURI: process.env.SUPERTOKENS_CONNECTION_URI || 'http://users-service:3567',
    },
    appInfo,
    recipeList: [
      ThirdPartyEmailPasswordNode.init({
        providers: getSocialLoginProviders()
      }),
      SessionNode.init(),
    ],
    isInServerlessEnv: true,
  }
}
