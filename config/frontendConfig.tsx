import ThirdPartyEmailPasswordReact from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import SessionReact from 'supertokens-auth-react/recipe/session'
import { appInfo } from './appInfo'

export const frontendConfig = (): { appInfo: object, recipeList: array } => {
  const getAvailableSocialProviders = (): array => {
    const socialProviderNodes = {
      github: process.env.GITHUB_CLIENT_ID as boolean && ThirdPartyEmailPasswordReact.Github.init(),
      google: process.env.GOOGLE_CLIENT_ID as boolean && ThirdPartyEmailPasswordReact.Google.init(),
      facebook: process.env.FACEBOOK_CLIENT_ID as boolean && ThirdPartyEmailPasswordReact.Facebook.init(),
      apple: process.env.APPLE_CLIENT_ID as boolean && ThirdPartyEmailPasswordReact.Apple.init()
    }
    const availableSocialProvidersNodes = Object.keys(socialProviderNodes).map(providerKey => {
      if (socialProviderNodes[providerKey] !== undefined) { return socialProviderNodes[providerKey] }
      return undefined
    })
    return availableSocialProvidersNodes.filter(provider => provider !== undefined)
  }

  return {
    appInfo,
    recipeList: [
      ThirdPartyEmailPasswordReact.init({
        emailVerificationFeature: {
          mode: 'REQUIRED'
        },
        signInAndUpFeature: {
          providers: getAvailableSocialProviders()
        }
      }),
      SessionReact.init()
    ]
  }
}
