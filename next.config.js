const {
    PHASE_DEVELOPMENT_SERVER,
    PHASE_PRODUCTION_BUILD,
  } = require('next/constants')

module.exports = function phasedCustomConfiguration(phase) {
    const isDev = phase === PHASE_DEVELOPMENT_SERVER
    const isProd = phase === PHASE_PRODUCTION_BUILD && process.env.STAGING !== '1'
    const isStaging =
          phase === PHASE_PRODUCTION_BUILD
                && process.env.PAYBUTTON_ENV === 'staging'
    const branch = process.env.BRANCH || 'master'
    const base_url = process.env.PAYBUTTON_BASE_PATH || 'paybutton.io'
    const port = process.env.PORT || '3000'
    const env = {
      WEBSITE_DOMAIN: process.env.WEBSITE_DOMAIN ||'localhost',
        API_DOMAIN: process.env.API_DOMAIN || 'localhost',
	PAYBUTTON_BASE_PATH: process.env.PAYBUTTON_BASE_PATH || "",
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
      GRPC_NODE_URL_FALLBACK: process.env.GRPC_NODE_URL_FALLBACK,
    }

    return {
	env,
	typescript: {
	    "ignoreBuildErrors": true
	},
	basePath: process.env.PAYBUTTON_BASE_PATH || '',
    }
  }

