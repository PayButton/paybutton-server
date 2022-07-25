const {
    PHASE_DEVELOPMENT_SERVER,
    PHASE_PRODUCTION_BUILD,
  } = require('next/constants')
  
  // This uses phases as outlined here: https://nextjs.org/docs/#custom-configuration
  module.exports = (phase) => {
    // when started in development mode `next dev` or `npm run dev` regardless of the value of STAGING environmental variable
    const isDev = phase === PHASE_DEVELOPMENT_SERVER
    // when `next build` or `npm run build` is used
    const isProd = phase === PHASE_PRODUCTION_BUILD && process.env.STAGING !== '1'
    // when `next build` or `npm run build` is used
    const isStaging =
      phase === PHASE_PRODUCTION_BUILD && process.env.STAGING === '1'
  
    console.log(`isDev:${isDev}  isProd:${isProd}   isStaging:${isStaging}`)
    const branch = process.env.BRANCH || 'master'
    const base_url = process.env.BASE_URL || 'paybutton.io'
    const env = {
      APP_URL: (() => {
        if (isDev) return 'http://localhost:3000'
        if (isProd) {
          return branch === 'master' ? `https://${base_url}` : `https://${branch.replaceAll('/', '-')}.${base_url}`
        }
        return 'APP_URL:not (isDev,isProd && !isStaging,isProd && isStaging)'
      })(),
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      FACEBOOK_CLIENT_ID: process.env.FACEBOOK_CLIENT_ID,
      FACEBOOK_CLIENT_SECRET: process.env.FACEBOOK_CLIENT_SECRET,
      APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID,
      APPLE_KEY_ID: process.env.APPLE_KEY_ID,
      APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY,
      APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
      SUPERTOKENS_API_KEY: process.env.SUPERTOKENS_API_KEY,
      SUPERTOKENS_CONNECTION_URI: process.env.SUPERTOKENS_CONNECTION_URI,
      GRPC_NODE_URL: process.env.GRPC_NODE_URL,
      WEBSITE_DOMAIN: process.env.WEBSITE_DOMAIN,
      WEBSITE_BASE_PATH: process.env.WEBSITE_BASE_PATH,
      API_DOMAIN: process.env.API_DOMAIN,
      API_BASE_PATH: process.env.API_BASE_PATH,
      APP_NAME: process.env.APP_NAME
    }
  
    return {
      env,
      outputFileTracing: true,
      basePath: process.env.WEBSITE_BASE_PATH,
      async rewrites() {
        return [
          {
            source: '/address/transactions/:address',
            destination: `${env.API_BASE_PATH}/transactions/:address`,
          },
          {
            source: '/address/balance/:address',
            destination: `${env.API_BASE_PATH}/balance/:address`,
          },
          {
            source: '/:path*',
            destination: '/:path*',
          },
          {
            source: '/:path*',
            destination: `${env.API_BASE_PATH}/:path*`,
          },
        ]
      },
    }
  }
