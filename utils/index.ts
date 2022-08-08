import xecaddr from 'xecaddrjs'
import { RESPONSE_MESSAGES } from '../constants/index'


export const getAddressPrefix = function (addressString: string): string {
  try {
    const format = xecaddr.detectAddressFormat(addressString)
    const network = xecaddr.detectAddressNetwork(addressString)
    if (format === xecaddr.Format.Xecaddr) {
      if (network === xecaddr.Network.Mainnet) {
        return 'ecash'
      } else if (network === xecaddr.Network.Testnet) {
        return 'ectest'
      }
    } else if (format === xecaddr.Format.Cashaddr) {
      if (network === xecaddr.Network.Mainnet) {
        return 'bitcoincash'
      } else if (network === xecaddr.Network.Testnet) {
        return 'bchtest'
      }
    }
  } catch {
    throw new Error(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  }
  throw new Error(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
}

