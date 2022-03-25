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
        ],
      }),
      SessionNode.init(),
    ],
    isInServerlessEnv: true,
  }
}
