const port: number = (process.env.APP_PORT !== 0 as number || 3000)

const apiBasePath = '/api/auth/'

export const websiteDomain: string =
    (process.env.APP_URL as boolean && process.env.APP_URL as string) ||
    (process.env.NEXT_PUBLIC_APP_URL as boolean && process.env.NEXT_PUBLIC_APP_URL as string) ||
  `http://localhost:${port}`

export const appInfo = {
  appName: 'PayButton.io',
  websiteDomain,
  apiDomain: websiteDomain,
  apiBasePath
}
