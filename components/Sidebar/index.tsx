import React, { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import MenuItem from '../MenuItem'
import style from './sidebar.module.css'
import logoImageSource from 'assets/logo.png'
import Telegram from 'assets/telegram.png'
import X from 'assets/x.png'
import Image from 'next/image'
import Dashboard from 'assets/dashboard-icon.png'
import Payments from 'assets/payments-icon.png'
import ButtonsIcon from 'assets/button-icon.png'
import Wallets from 'assets/wallet-icon.png'
import Networks from 'assets/network-icon.png'
import Account from 'assets/user-icon.png'
import Docs from 'assets/docs.png'

import Admin from 'assets/admin-icon.png'
import Logout from 'assets/logout-icon.png'
import WordPressIcon from 'assets/button-icon.png'
import { UserProfile } from '@prisma/client'
const ThemeToggle = dynamic(async () => await import('./themetoggle'), {
  ssr: false
})

const MENU_ITEMS = [
  {
    name: 'Dashboard',
    image: Dashboard
  },
  {
    name: 'Payments',
    image: Payments
  },
  {
    name: 'Buttons',
    image: ButtonsIcon
  },
  {
    name: 'Wallets',
    image: Wallets
  },
  {
    name: 'Networks',
    image: Networks
  },
  {
    name: 'Account',
    image: Account
  },
  {
    name: 'Admin',
    image: Admin,
    isRestricted: true
  },
  // {
  //   name:'Settings',
  //   image: Settings
  // },
  // {
  //   name:'Help',
  //   image: Help
  // },
  {
    name: 'Logout',
    image: Logout
  }
]

interface IProps {
  chart: boolean
  setChart: Function
  loggedUser: UserProfile
}

const Sidebar: React.FC = ({ chart, setChart, loggedUser }: IProps) => {
  const [menu, setMenu] = useState(false)
  const useMediaQuery = (width: number): boolean => {
    const [targetReached, setTargetReached] = useState(false)
    const updateTarget = useCallback((e) => {
      if (e.matches === true) {
        setTargetReached(true)
      } else {
        setTargetReached(false)
      }
    }, [])

    useEffect(() => {
      const media = window.matchMedia(`(max-width: ${width}px)`)
      media.addEventListener('change', e => updateTarget(e))

      if (media.matches) {
        setTargetReached(true)
      }

      return () => media.removeEventListener('change', e => updateTarget(e))
    }, [])

    return targetReached
  }

  const isBreakpoint = useMediaQuery(960)

  const setCheckBox = (): void => {
    document.getElementById('menu__toggle').checked = false
  }

  return (
  <>
  {loggedUser === undefined
    ? null
    : <>
  {isBreakpoint &&
    <div className={style.topmenu}>
      <Link href='/' passHref>
        <Image className={style.image} src={logoImageSource} alt='PayButton' width={120} height={22} />
      </Link>
      <div className={style.menu_ctn_outer}>
        <input id="menu__toggle" className={style.menu_ctn} type="checkbox" onClick={() => setMenu(!menu)}/>
        <label className={style.menu_btn} htmlFor="menu__toggle">
          <span></span>
        </label>
      </div>
    </div>
  }
    <aside className={menu ? `${style.aside} ${style.show_menu}` : style.aside} role='complementary'>
      <div>
        {!isBreakpoint &&
        <section className={style.section}>
          <Link href='/' passHref>
            <Image className={style.image} src={logoImageSource} alt='PayButton' width={140} height={26} />
          </Link>
        </section>
        }

        <nav>
          <ul className={style.ul} onClick={isBreakpoint ? () => { setMenu(!menu); setCheckBox() } : null}>
            {MENU_ITEMS
              .filter(item => item.isRestricted !== true || loggedUser.isAdmin === true)
              .map(item =>
                <MenuItem key={item.name} name={item.name} image={item.image} isRestricted={item.isRestricted}/>
              )}
          </ul>
        </nav>
      </div>
      <div className={style.socialctn}>
        <ThemeToggle chart={chart} setChart={setChart} />
        <a href='https://t.me/paybutton' target="_blank" rel="noreferrer noopener">
          <Image src={Telegram} alt='telegram' width={20} height={20} />
          <span className={style.tooltiptext}>Telegram</span>
        </a>
        <a href='https://x.com/thepaybutton' target="_blank" rel="noreferrer noopener">
          <Image src={X} alt='X' width={20} height={20} />
          <span className={style.tooltiptext}>X</span>
        </a>
        <a href='https://docs.paybutton.org/#/?id=what-is-paybutton' target="_blank" rel="noreferrer noopener">
          <Image src={Docs} alt='docs' width={20} height={20} />
          <span className={style.tooltiptext}>Docs</span>
        </a>
        <a href='https://wordpress.org/plugins/paybutton/' target="_blank" rel="noreferrer noopener">
          <Image src={WordPressIcon} alt='wordpress plugin' width={20} height={20} />
          <span className={style.tooltiptext}>WordPress Plugin</span>
        </a>
      </div>
    </aside>
    </>
    }
  </>
  )
}

export default Sidebar
