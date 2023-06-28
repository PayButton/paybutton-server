const websiteBasePath: string = process.env.WEBSITE_BASE_PATH as string
const apiBasePath: string = process.env.API_BASE_PATH as string

export const backEndAppInfo = {
  appName: process.env.APP_NAME,
  apiBasePath: `${apiBasePath}/auth`,
  apiDomain: process.env.API_DOMAIN,
  websiteBasePath: `${websiteBasePath}/auth`,
  websiteDomain: process.env.WEBSITE_DOMAIN ?? 'localhost:3000'
}

export const appInfo = {
  ...backEndAppInfo,
  sseBaseURL: process.env.SSE_BASE_URL ?? 'http://localhost:5000',
  showTestNetworks: JSON.parse(process.env.SHOW_TEST_NETWORKS ?? 'false'),
  priceAPIURL: process.env.PRICE_API_URL ?? '',
  priceAPIToken: process.env.PRICE_API_TOKEN ?? '',
  redisURL: process.env.REDIS_URL ?? 'redis://paybutton-cache:6379'
}
