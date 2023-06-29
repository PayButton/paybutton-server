import localConfig from '../paybutton-config.json'

interface Config {
  appName: string
  apiDomain: string
  websiteDomain: string
  apiBasePath?: string
  websiteBasePath?: string

  sseBaseURL: string
  sseAuthKey: string
  showTestNetworks: false
  grpcBCHNodeURL: string
  grpcBCHNodeTestURL: string
  grpcXECNodeURL: string
  priceAPIURL: string
  priceAPIToken: string
  redisURL: string
}

const readConfig = (): Config => {
  config = localConfig as Config
  config.appName = 'PayButton'
  return config
}

let config: Config

interface CustomNodeJsGlobal extends NodeJS.Global {
  config: Config
}
declare const global: CustomNodeJsGlobal

if (global.config === undefined) {
  global.config = readConfig()
}

config = global.config

export default config
