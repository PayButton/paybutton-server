import React, { useState, useCallback, useEffect } from 'react'
import dynamic from "next/dynamic";
import MenuItem from '../MenuItem'
import style from './sidebar.module.css'
import logoImageSource from 'assets/logo.png'
import Telegram from 'assets/telegram.png'
import Twitter from 'assets/twitter.png'
import Image from 'next/image'
import Dashboard from 'assets/dashboard-icon.png'
import Payments from 'assets/payments-icon.png'
import ButtonsIcon from 'assets/button-icon.png'
import Wallets from 'assets/wallet-icon.png'
import Networks from 'assets/network-icon.png'
import Account from 'assets/user-icon.png'
import Docs from 'assets/docs.png'
// import Settings from 'assets/settings-icon.png'
// import Help from 'assets/help-icon.png'
import Logout from 'assets/logout-icon.png'
const ThemeToggle = dynamic(() => import("./themetoggle"), {
  ssr: false,
});

const MENU_ITEMS = [
  {
    name:'Dashboard',
    image: Dashboard
  },
  {
    name:'Payments',
    image: Payments
  },
  {
    name:'Buttons',
    image: ButtonsIcon
  },
  {
    name:'Wallets',
    image: Wallets
  },
  {
    name:'Networks',
    image: Networks
  },
  {
    name:'Account',
    image: Account
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
    name:'Logout',
    image: Logout
  },
]

const Sidebar = ({chart, setChart, loggedin}) => {
  const [menu, setMenu] = useState(false);
  const useMediaQuery = (width) => {
    const [targetReached, setTargetReached] = useState(false);
    const updateTarget = useCallback((e) => {
      if (e.matches) {
        setTargetReached(true);
      } else {
        setTargetReached(false);
      }
    }, []);
  
    useEffect(() => {
      const media = window.matchMedia(`(max-width: ${width}px)`)
      media.addEventListener('change', e => updateTarget(e))

      if (media.matches) {
        setTargetReached(true)
      }
  
      return () => media.removeEventListener('change', e => updateTarget(e))
    }, [])
  
    return targetReached;
  };

  const isBreakpoint = useMediaQuery(900)

  return (
  <>
  {loggedin === undefined ? null :
  <>
  {isBreakpoint &&
    <div className={style.topmenu}>
      <Image className={style.image} src={logoImageSource} alt='PayButton' width={120} height={22} />
      <div className={style.menu_ctn_outer}>
        <input id="menu__toggle" className={style.menu_ctn} type="checkbox" onClick={()=>setMenu(!menu)}/>
        <label className={style.menu_btn} htmlFor="menu__toggle">
          <span></span>
        </label>
      </div>
    </div>
  }
    <aside className={menu ? `${style.aside} ${style.show_menu}`:style.aside} role='complementary'>
      <div>
        {!isBreakpoint &&
        <section className={style.section}>
          <Image className={style.image} src={logoImageSource} alt='PayButton' width={140} height={26} />
        </section>
        }
     
        <nav>
          <ul className={style.ul}>
            {MENU_ITEMS.map(itemName =>
              <MenuItem key={itemName.name} name={itemName.name} image={itemName.image} />
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
        <a href='https://twitter.com/thepaybutton' target="_blank" rel="noreferrer noopener">
          <Image src={Twitter} alt='twitter' width={20} height={20} />
          <span className={style.tooltiptext}>Twitter</span>
        </a>
        <a href='https://docs.paybutton.org' target="_blank" rel="noreferrer noopener">
          <Image src={Docs} alt='twitter' width={20} height={20} />
          <span className={style.tooltiptext}>Docs</span>
        </a>
      </div>
    </aside>
    </>
    }
  </>
)}

export default Sidebar
