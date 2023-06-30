import { KeyValueT } from 'constants/index'
import localConfig from '../paybutton-config.json'

export type BlockchainClientOptions = 'grpc' | 'chronik'

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
  grpcXECNodeURL: string
  chronikClientURL: string
  priceAPIURL: string
  priceAPIToken: string
  redisURL: string
  networkBlockchainClients: KeyValueT<BlockchainClientOptions>
  networksUnderMaintenance: KeyValueT<boolean>
}

const readConfig = (): Config => {
  config = localConfig as unknown as Config
  config.appName = 'PayButton'
  if (config.networksUnderMaintenance === undefined) {
    config.networksUnderMaintenance = {}
  }
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