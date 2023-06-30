import ThirdPartyEmailPasswordReact from 'supertokens-auth-react/recipe/thirdpartyemailpassword'
import SessionReact from 'supertokens-auth-react/recipe/session'
import { appInfo } from './appInfo'

export const frontendConfig = (): { appInfo: object, recipeList: array } => {
  return {
    appInfo,
    recipeList: [
      ThirdPartyEmailPasswordReact.init({
        emailVerificationFeature: {
          mode: 'REQUIRED'
        },
        palette: {
          primary: '#669cfe',
          superTokensBrandingBackground: 'transparent',
          superTokensBrandingText: 'transparent'
        }
      }),
      SessionReact.init()
    ]
  }
}
