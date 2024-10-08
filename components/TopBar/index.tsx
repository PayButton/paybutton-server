import Link from 'next/link'
import style from './topbar.module.css'

interface TopBarProps {
  title: string
  user?: string
}

export default function TopBar ({ title, user }: TopBarProps): JSX.Element {
  const currentDate = new Date()
  const month = currentDate.toLocaleString('en-US', { month: 'long' })
  const day = currentDate.getDate()
  const year = currentDate.getFullYear()

  return (
    <div className={style.topbar_ctn}>
      <div className={style.title_ctn}>
        <h2>{title}</h2>
        <span>
          {month} {day}, {year}
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
