import EmailPassword from "supertokens-auth-react/recipe/emailpassword";
import SessionReact from 'supertokens-auth-react/recipe/session'
import EmailPasswordNode from "supertokens-node/recipe/emailpassword";
import SessionNode from 'supertokens-node/recipe/session'


let appInfo = {
  appName: 'PayButton',
  websiteDomain: "http://localhost:3000",
  apiDomain: "http://localhost:3000",
  apiBasePath: "/api/auth/",
}

export let frontendConfig = () => {
  return {
    useReactRouterDom: false,
    appInfo,
    recipeList: [
        EmailPassword.init(),
        SessionReact.init()
    ],
  }
}

export let backendConfig = () => {
  return {
    supertokens: {
      connectionURI: "https://try.supertokens.io",
    },
    appInfo,
    recipeList: [EmailPasswordNode.init(), SessionNode.init()],
    isInServerlessEnv: true,
  };
}
