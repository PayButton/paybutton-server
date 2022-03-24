const port = process.env.APP_PORT || 3000

export const getAppUrl = () : string => {
    const CURRENT_BRANCH = process.env.BRANCH || 'master'
    const APP_BASE_URL = process.env.APP_BASE_URL || 'localhost'
    const APP_URL = CURRENT_BRANCH !== 'master' ? `https://${CURRENT_BRANCH}.${APP_BASE_URL}` : `https://${APP_BASE_URL}`
    const ENV_APP_URL = process.env.NODE_ENV == 'production' ? APP_URL : `http://localhost:${port}`
    return ENV_APP_URL
}