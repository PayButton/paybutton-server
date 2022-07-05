import React, { FunctionComponent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import style from './menuitem.module.css'
import ThirdPartyEmailPassword from 'supertokens-auth-react/recipe/thirdpartyemailpassword'

export interface MenuItemProps {
  name: string
  image: string
}

const MenuItem = ({ name, image }: MenuItemProps): FunctionComponent<MenuItemProps> => {
  const { pathname } = useRouter()
  const href = '/' + name.toLowerCase()
  const isActive = pathname === href

  const computedStyle = isActive || pathname === '/' && name === 'Dashboard' ? `${style.li} ${style.active}` : style.li

  async function handleLogout (): Promise<void> {
    await ThirdPartyEmailPassword.signOut()
    void ThirdPartyEmailPassword.redirectToAuth()
  }

  return (
    <li className={computedStyle}>
      {name === "Logout" ? 
        <div className={style.link} onClick={handleLogout}>
        <div className={style.imagectn}><Image className={style.image} src={image} alt='PayButton' width={15} height={15} /></div>{name}
        </div>
      :
      <Link href={href}>
        <div className={style.link}>
        <div className={style.imagectn}><Image className={style.image} src={image} alt='PayButton' width={15} height={15} /></div>{name}
        </div>
      </Link>}
    </li>
  )
}

export default MenuItem
