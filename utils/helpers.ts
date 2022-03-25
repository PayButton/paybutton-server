import { BRANCH, APP_BASE_URL } from './constants'
const port = process.env.APP_PORT || 3000


export const getAppUrl = () : string => {
    const CURRENT_BRANCH = BRANCH || 'master'
    const FORMATTED_BRANCH = CURRENT_BRANCH.replace('/', '-')
    const APP_URL = CURRENT_BRANCH !== 'master' ? `https://${FORMATTED_BRANCH}.${APP_BASE_URL}` : `https://${APP_BASE_URL}`
    const ENV_APP_URL = process.env.NODE_ENV == 'production' ? APP_URL : `http://localhost:${port}`
    return ENV_APP_URL
}