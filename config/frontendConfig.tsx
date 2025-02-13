import { appInfo } from './appInfo'
import EmailpasswordWebJs from 'supertokens-web-js/recipe/emailpassword'
import SessionWebJs from 'supertokens-web-js/recipe/session'
import EmailVerification from 'supertokens-web-js/recipe/emailverification'

export const frontendConfig = (): { appInfo: object, recipeList: array } => {
  return {
    appInfo,
    recipeList: [
      EmailpasswordWebJs.init(),
      SessionWebJs.init(),
      EmailVerification.init()
    ]
  }
}
