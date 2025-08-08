import { useEffect, useState } from 'react'
import ProPurchase from './ProPurchase'
import style from './account.module.css'
import stylep from '../../pages/account/account.module.css'
import config from 'config/index'

const ProConfig = (): JSX.Element => {
  const [text, setText] = useState('')
  const [isPro, setIsPro] = useState<boolean | null>()

  const showLimit = (configLimit: number | 'Inf'): string => {
    return configLimit === 'Inf' ? 'Unlimited' : configLimit.toString()
  }

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/user/remainingProTime')
      if (res.status === 200) {
        const remainingMs: number | null = await res.json()
        if (remainingMs === null) {
          setIsPro(false)
          setText('You are not PRO.')
        } else if (remainingMs <= 0) {
          setIsPro(false)
          setText('Your PRO has expired.')
        } else {
          const futureDate = new Date(Date.now() + remainingMs)
          setIsPro(true)
          setText(`You are PRO until ${futureDate.toLocaleDateString()}.`)
        }
      } else {
        setText('Failed to fetch PRO status')
      }
    })()
  }, [])

  return <>
    <h3>PayButton Pro</h3>
    <div className={style.pro_ctn}>
      <div className={stylep.label}>
        {text}
      </div>
      {isPro === false && <ProPurchase/>}
      <div className={stylep.public_key_info_ctn}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Standard</th>
              <th>Pro</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Outgoing Emails on Payment</td>
              <td>{showLimit(config.proSettings.standardDailyEmailLimit)} / day</td>
              <td>{showLimit(config.proSettings.proDailyEmailLimit)} / day</td>
            </tr>
            <tr>
              <td>Addresses Per Button</td>
              <td>{showLimit(config.proSettings.standardAddressesPerButtonLimit)}</td>
              <td>{showLimit(config.proSettings.proAddressesPerButtonLimit)}</td>
            </tr>
            <tr>
              <td>Outgoing Server-to-Server Messages On Payment</td>
              <td>{showLimit(config.proSettings.standardDailyEmailLimit)} / day</td>
              <td>{showLimit(config.proSettings.proDailyEmailLimit)} / day</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </>
}

export default ProConfig
