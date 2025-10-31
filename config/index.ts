import { KeyValueT, RESPONSE_MESSAGES } from 'constants/index'
import localConfig from '../paybutton-config.json'

export type BlockchainClientOptions = 'grpc' | 'chronik'

interface ProSettings {
  enabled: boolean
  monthsCost: Record<string, number>
  payoutAddress: string
  standardDailyEmailLimit: number
  proDailyEmailLimit: number
  standardDailyPostLimit: number
  proDailyPostLimit: number
  standardAddressesPerButtonLimit: number
  proAddressesPerButtonLimit: number
}

interface Config {
  appName: string
  apiDomain: string
  websiteDomain: string
  apiBasePath?: string
  websiteBasePath?: string

  wsBaseURL: string
  showTestNetworks: false
  priceAPIURL: string
  redisURL: string
  networkBlockchainClients: KeyValueT<BlockchainClientOptions>
  networkBlockchainURLs: KeyValueT<string[]>
  networksUnderMaintenance: KeyValueT<boolean>
  triggerPOSTTimeout: number
  sideshiftAffiliateId: string
  smtpHost: string
  smtpPort: number
  proSettings: ProSettings
}

const readConfig = (): Config => {
  config = localConfig as unknown as Config
  config.appName = 'PayButton'

  // normalize "Inf" → Infinity
  const p = config.proSettings as unknown as Record<string, unknown>
  for (const key of Object.keys(p)) {
    if (p[key] === 'Inf') {
      p[key] = Infinity
    }
  }

  if (config.networksUnderMaintenance === undefined) {
    config.networksUnderMaintenance = {}
  }
  if (config.networkBlockchainURLs === undefined) {
    config.networkBlockchainURLs = {}
  }
  if (
    (
      config.networkBlockchainURLs.ecash === undefined ||
      config.networkBlockchainURLs.ecash.length === 0
    ) &&
    !config.networksUnderMaintenance.ecash
  ) {
    throw new Error(RESPONSE_MESSAGES.MISSING_BLOCKCHAIN_CLIENT_URL_400('ecash').message)
  } else if (
    (
      config.networkBlockchainURLs.bitcoincash === undefined ||
      config.networkBlockchainURLs.bitcoincash.length === 0
    ) &&
    !config.networksUnderMaintenance.bitcoincash
  ) {
    throw new Error(RESPONSE_MESSAGES.MISSING_BLOCKCHAIN_CLIENT_URL_400('bitcoincash').message)
  }
  const wsURLSplit = config.wsBaseURL.split('//')
  const noProtocolWsURL = wsURLSplit[wsURLSplit.length - 1]
  if (process.env.NODE_ENV === 'production') {
    config.wsBaseURL = `wss://${noProtocolWsURL}`
  } else {
    config.wsBaseURL = `ws://${noProtocolWsURL}`
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
