import React, { FunctionComponent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import style from './menuitem.module.css'
import Session from 'supertokens-web-js/recipe/session'

export interface MenuItemProps {
  name: string
  image: string
  isRestricted?: boolean
}

const MenuItem = ({ name, image, isRestricted }: MenuItemProps): FunctionComponent<MenuItemProps> => {
  const { pathname } = useRouter()
  const href = '/' + name.toLowerCase()
  const isActive = pathname === href

  let computedStyle = isActive || (pathname === '/button/[id]' && name === 'Buttons') ? `${style.li} ${style.active}` : style.li
  if (isRestricted === true) {
    computedStyle = `${computedStyle} ${style.restricted}`
  }

  async function handleLogout (): Promise<void> {
    await Session.signOut()
    window.location.href = '/signin'
  }

  return (
    <li className={computedStyle}>
      {name === 'Logout'
        ? <div className={style.link} onClick={() => { void handleLogout() }}>
        <div className={style.imagectn}><Image className={style.image} src={image} alt='PayButton' width={15} height={15} /></div>{name}
        </div>
        : <Link href={href} passHref>
            <div className={style.link}>
              <div className={style.imagectn}><Image className={style.image} src={image} alt='PayButton' width={15} height={15} /></div>{name}
            </div>
      </Link>}
    </li>
  )
}

export default MenuItem
