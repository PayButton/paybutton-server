import Link from 'next/link'
import { useState, useEffect } from 'react'
import style from './topbar.module.css'

interface TopBarProps {
  title: string
  user?: string
}

export default function TopBar ({ title, user }: TopBarProps): JSX.Element {
  const [dateString, setDateString] = useState<string>('')

  useEffect(() => {
    const currentDate = new Date()
    const month = currentDate.toLocaleString('en-US', { month: 'long' })
    const day = currentDate.getDate()
    const year = currentDate.getFullYear()
    setDateString(`${month} ${day}, ${year}`)
  }, [])

  return (
    <div className={style.topbar_ctn}>
      <div className={style.title_ctn}>
        <h2>{title}</h2>
        <span>
          {dateString}
        </span>
      </div>
      <div className={style.profile_ctn}>
        <Link className={style.profile} href="/account">
          {user}
        </Link>
      </div>
    </div>
  )
}
