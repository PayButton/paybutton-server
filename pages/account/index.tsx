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
import { getUserPrivateKey } from 'services/userService'
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
      userSecret: await getUserPrivateKey(userId)
    }
  }
}

interface IProps {
  userId: string
  user: ThirdPartyEmailPasswordNode.User | undefined
  userSecret: string
}

export default function Account ({ user, userId, userSecret }: IProps): React.ReactElement {
  const [changePassword, setChangePassword] = useState(false)
  const [secretKeyInfo, setSecretKeyInfo] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const toggleChangePassword = (): void => {
    setChangePassword(!changePassword)
  }
  const toggleSecretKeyInfo = (): void => {
    setSecretKeyInfo(!secretKeyInfo)
  }

  const handleCopyClick = async (): Promise<void> => {
    const textToCopy = userSecret
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
        <div className={style.account_card}>{user.email}</div>
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
         <div className={style.label} style={{ marginTop: '50px' }}>Secret key <span className={style.secret_info_btn} onClick={() => toggleSecretKeyInfo()}>What is this?</span></div>
        <div className={style.secret_card_ctn}>
          <div className={style.secret_card}>
            {userSecret}
            {isCopied && <div className={style.copied_confirmation}>Copied!</div>}
          </div>
          <div className={style.copy_btn} onClick={() => { void handleCopyClick() } }><Image src={CopyIcon} alt="copy" /></div>
        </div>
        {secretKeyInfo && (
            <div className={style.secret_info_ctn}>
              This can be used to verify the authenticity of a message received from a paybutton trigger.
              <br/>
              <br/>
              To verify, take the variables &lt;amount&gt;, &lt;currency&gt;, &lt;address&gt;, &lt;timestamp&gt;, and &lt;txId&gt; and concatenate them into a single string using the plus (+) symbol as a separator. The string should look like this: `&lt;amount&gt;+&lt;currency&gt;+&lt;address&gt;+&lt;timestamp&gt;+&lt;txId&gt;`.
              <br/>
              <br/>
              Next, pass this concatenated string to the `sha256` hash function to generate a hash. Make sure to get the output in hexadecimal format. This will give you the data hash digest.
              <br/>
              <br/>
              Now, you'll need your secret key. Use this secret key to create an HMAC (Hash-based Message Authentication Code) using the `sha256` algorithm. Pass the data hash digest you just generated as the data to hash.
              <br/>
              <br/>
              Finally, compare the resulting HMAC digest with the one you received. If they match, the message is authentic and has not been tampered with.

          </div>
        )}
         {secretKeyInfo &&
          <div
          onClick={() => toggleSecretKeyInfo()}
          className={`${style.updatebtn} button_outline`}
          >Close</div>
        }
      </div>
    )
  }
  return <Page />
}
