import React, { FunctionComponent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import style from './menuitem.module.css'

export interface MenuItemProps {
  name: string
  image: string
}

const MenuItem = ({ name, image }: MenuItemProps): FunctionComponent<MenuItemProps> => {
  const { pathname } = useRouter()
  const href = '/' + name.toLowerCase()
  const isActive = pathname === href

  const computedStyle = isActive ? `${style.li} ${style.active}` : style.li

  return (
    <li className={computedStyle}>
      <Link href={href}>
        <div className={style.link}>
        <div className={style.imagectn}><Image className={style.image} src={image} alt='PayButton' width={18} height={18} /></div>{name}
        </div>
      </Link>
    </li>
  )
}

export default MenuItem
