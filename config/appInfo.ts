const websiteBasePath: string = (process.env.WEBSITE_BASE_PATH as boolean) && (process.env.WEBSITE_BASE_PATH as string)
const apiBasePath: string = (process.env.API_BASE_PATH as boolean) && (process.env.API_BASE_PATH as string)
export const appInfo = {
  appName: process.env.APP_NAME,
  apiBasePath: `${apiBasePath}/auth`,
  apiDomain: process.env.API_DOMAIN,
  websiteBasePath: `${websiteBasePath}/auth`,
  websiteDomain: process.env.WEBSITE_DOMAIN
}
