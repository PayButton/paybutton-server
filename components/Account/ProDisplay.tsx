import { useEffect, useState } from 'react'
import ProPurchase from './ProPurchase'
import style from './account.module.css'
import stylep from '../../pages/account/account.module.css'

const ProConfig = (): JSX.Element => {
  const [text, setText] = useState('')
  const [isPro, setIsPro] = useState<boolean | null>()
  const [infoModal, setInfoModal] = useState(false)

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
        <div
          onClick={() => setInfoModal(!infoModal)}
          className={stylep.whats_this_btn}
        >
          {infoModal ? 'Close' : 'What is this?'}
        </div>
      </div>
      {isPro === false && <ProPurchase/>}
      {infoModal && (
        <div className={stylep.public_key_info_ctn}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec tincidunt risus libero, venenatis commodo nibh commodo eget. Aenean turpis tellus, consectetur vel consequat nec, vehicula quis odio. Sed vitae venenatis orci. Vestibulum a facilisis tellus. Nunc at hendrerit
        </div>
      )}
    </div>
  </>
}

export default ProConfig
