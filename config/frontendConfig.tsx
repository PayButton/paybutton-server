import { appInfo } from './appInfo'
import ThirdPartyEmailPasswordWebJs from 'supertokens-web-js/recipe/thirdpartyemailpassword'
import SessionWebJs from 'supertokens-web-js/recipe/session'
import EmailVerification from 'supertokens-web-js/recipe/emailverification'

export const frontendConfig = (): { appInfo: object, recipeList: array } => {
  return {
    appInfo,
    recipeList: [
      ThirdPartyEmailPasswordWebJs.init(),
      SessionWebJs.init(),
      EmailVerification.init()
    ]
  }
}
