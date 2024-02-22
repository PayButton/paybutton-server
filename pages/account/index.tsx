import React, { useState } from 'react'
import Image from 'next/image'
import ThirdPartyEmailPasswordNode from 'supertokens-node/recipe/thirdpartyemailpassword'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'
import Page from 'components/Page'
import ChangePassword from 'components/Account/ChangePassword'
import style from './account.module.css'
import { getUserPublicKeyHex } from 'services/userService'
import CopyIcon from '../../assets/copy-black.png'

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
  if (session === undefined) return
  const userId = session?.getUserId()

  return {
    props: {
      userId,
      user: await ThirdPartyEmailPasswordNode.getUserById(userId),
      userPublicKey: await getUserPublicKeyHex(userId)
    }
  }
}

interface IProps {
  user: ThirdPartyEmailPasswordNode.User | undefined
  userPublicKey: string
}

export default function Account ({ user, userPublicKey }: IProps): React.ReactElement {
  const [changePassword, setChangePassword] = useState(false)
  const [publicKeyInfo, setPublicKeyInfo] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const toggleChangePassword = (): void => {
    setChangePassword(!changePassword)
  }
  const togglePublicKeyInfo = (): void => {
    setPublicKeyInfo(!publicKeyInfo)
  }

  const handleCopyClick = async (): Promise<void> => {
    const textToCopy = userPublicKey
    try {
      await navigator.clipboard.writeText(textToCopy)
      setIsCopied(true)
      setTimeout(() => {
        setIsCopied(false)
      }, 1000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  if (user !== null) {
    return (
      <div className={style.account_ctn}>
        <h2>Account</h2>
        <div className={style.label}>Email</div>
        <div className={style.account_card}>{user?.email}</div>
        {changePassword && (
          <>
            <div className={style.label}>Update Password</div>
            <ChangePassword toggleChangePassword={toggleChangePassword} />
          </>
        )}
         <div
          onClick={() => setChangePassword(!changePassword)}
          className={`${style.updatebtn} button_outline`}
        >
          {!changePassword ? 'Update Password' : 'Cancel'}
        </div>
         <div className={style.label} style={{ marginTop: '50px' }}>Public key <span className={style.public_key_info_btn} onClick={() => togglePublicKeyInfo()}>What is this?</span></div>
        <div className={style.public_key_card_ctn}>
          <div className={style.public_key_card}>
            {userPublicKey}
            {isCopied && <div className={style.copied_confirmation}>Copied!</div>}
          </div>
          <div className={style.copy_btn} onClick={() => { void handleCopyClick() } }><Image src={CopyIcon} alt="copy" /></div>
        </div>
        {publicKeyInfo && (
            <div className={style.public_key_info_ctn}>
              This can be used to verify the authenticity of a message received from a paybutton trigger.
              <br/>
              <br/>
              To verify, check variable &lt;signature&gt; variable. It should contain two keys:

              <br/>
              - payload: The transaction data variables present in the POST request concatenated using the plus (+) symbol as a separator.
              <br/>
              - signature: The signature of the payload.
              <br/>
              <br/>
              Check if the payload's signature came from the private key paired to this public key using your preferred method.

          </div>
        )}
         {publicKeyInfo &&
          <div
          onClick={() => togglePublicKeyInfo()}
          className={`${style.updatebtn} button_outline`}
          >Close</div>
        }
      </div>
    )
  }
  return <Page />
}
