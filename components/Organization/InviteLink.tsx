import { useEffect, useState } from 'react'
import style from './organization.module.css'
import {
  copyTextToClipboard
} from 'utils/index'

const InviteLink = (): JSX.Element => {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [copySuccess, setCopySuccess] = useState('')

  const elementId = 'inviteLink'

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/organization/invite')
      if (res.status === 200) {
        const data = await res.json()
        setUrl(data.url)
      } else {
        const json = await res.json()
        setError(json.message)
      }
    })()
  }, [])

  return <>
    {error !== '' && <div className={style.error_message}>{error}</div>}
    <div className={style.invite_link_outer}>
      <div id={elementId} className={style.invite_link} onClick={() => copyTextToClipboard(elementId, setCopySuccess)}>
        {url === ''
          ? <p> loading </p>
          : <>
            <b>{url}{copySuccess === elementId && <div className={style.copied_text}>Copied!</div>}</b>

          </>
        }
      </div>
    </div>

  </>
}

export default InviteLink
