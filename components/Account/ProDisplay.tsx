import { useEffect, useState } from 'react'
import ProPurchase from './ProPurchase'

const ProConfig = (): JSX.Element => {
  const [text, setText] = useState('')
  const [isPro, setIsPro] = useState<boolean | null>()

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/user/remainingProTime')
      if (res.status === 200) {
        const remainingMs: number | null = await res.json()
        if (remainingMs === null) {
          setText('You are not PRO.')
        } else if (remainingMs <= 0) {
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

  return <div className="WIP">
    <span>{text}</span>
    {isPro === false && <ProPurchase/>}
    </div>
}

export default ProConfig
