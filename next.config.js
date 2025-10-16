const paybuttonConfig = require('./paybutton-config.json')

const {
    PHASE_DEVELOPMENT_SERVER,
    PHASE_PRODUCTION_BUILD,
    PHASE_PRODUCTION_SERVER,
  } = require('next/constants')
  
  // This uses phases as outlined here: https://nextjs.org/docs/#custom-configuration
  module.exports = (phase) => {
    // when started in development mode `next dev` or `npm run dev` regardless of the value of STAGING environmental variable
    const isDev = phase === PHASE_DEVELOPMENT_SERVER
    // when `next build` or `npm run build` is used
    const isBuild = phase === PHASE_PRODUCTION_BUILD && process.env.STAGING !== '1'
    // when `next start` or `npm run start` is used
    const isProd = phase === PHASE_PRODUCTION_SERVER
    // when `next build` or `npm run build` is used
    const isStaging =
      phase === PHASE_PRODUCTION_BUILD && process.env.STAGING === '1'
  
    const branch = process.env.BRANCH || 'master'
    console.log(`branch: ${branch}\nisDev:${isDev}  isBuild:${isBuild}  isProd:${isProd}  isStaging:${isStaging}`)
  
    return {
      outputFileTracing: true,
      eslint: {
        ignoreDuringBuilds: true
      },
      typescript: {
        ignoreBuildErrors: true
      },
      async headers() {
        return [
          {
            source: '/:path*',
            headers: [
              { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
              { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
            ],
          },
        ]
      },
      async rewrites() {
        return [
          {
            source: '/:path*',
            destination: '/:path*',
          },
          {
            source: '/:path*',
            destination: `/api/:path*`,
          },
        ]
      },
    }
  }
