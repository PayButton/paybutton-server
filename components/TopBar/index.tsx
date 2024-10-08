import Image from 'next/image'
import Link from 'next/link'
import style from './topbar.module.css'

interface TopBarProps {
  title: string
  user: string | undefined
}

export default function TopBar ({ title, user }: TopBarProps): JSX.Element {
  const currentDate = new Date()
  const month = currentDate.toLocaleString('default', { month: 'long' })
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
          <div className={style.profile_pic}>
            <Image src="/user-icon.png" alt="user" fill />
          </div>
          {user}
        </Link>
      </div>
    </div>
  )
}
