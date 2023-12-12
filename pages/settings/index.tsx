import React from 'react'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
// import style from './settings.module.css'
import { SettingsProps } from '../_app'

export const getServerSideProps: GetServerSideProps = async (context) => {
  // this runs on the backend, so we must call init on supertokens-node SDK
  supertokensNode.init(SuperTokensConfig.backendConfig())
  let session
  try {
    session = await Session.getSession(context.req, context.res)
  } catch (err: any) {
    if (err.type === Session.Error.TRY_REFRESH_TOKEN) {
      return { props: { fromSupertokens: 'needs-refresh' } }
    } else if (err.type === Session.Error.UNAUTHORISED) {
      return { props: {} }
    } else {
      throw err
    }
  }

  return {
    props: { userId: session.getUserId() }
  }
}

const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
  return (
    <>
      <h2>Settings</h2>
      <div onClick={() =>
        setSettings((prevSettings) => ({
          ...prevSettings,
          xecDashboard: !prevSettings.xecDashboard
        }))
        }
        >Xec Dashboard Setting: {settings.xecDashboard ? 'Enabled' : 'Disabled'}</div>
    </>
  )
}

export default Settings
