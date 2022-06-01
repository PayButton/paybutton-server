const port: number = (process.env.APP_PORT !== 0 as number || 3000)

const apiBasePath = `${process.env.PAYBUTTON_BASE_PATH}/api/auth/`
const apiDomain = process.env.API_DOMAIN
const websiteBasePath = `${process.env.PAYBUTTON_BASE_PATH}/auth/`
const websiteDomain = process.env.WEBSITE_DOMAIN

export const appInfo = {
    appName: 'PayButton.io',
    apiDomain,
    websiteDomain,
    apiBasePath,
    websiteBasePath
}
