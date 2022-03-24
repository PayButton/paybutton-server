import { getAppUrl } from '../utils/helpers'
const apiBasePath = '/api/auth/'

export const websiteDomain = getAppUrl()

export const appInfo = {
  appName: process.env.APP_NAME,
  websiteDomain,
  apiDomain: websiteDomain,
  apiBasePath,
}
