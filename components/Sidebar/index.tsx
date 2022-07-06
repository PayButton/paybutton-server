import React, { FunctionComponent } from 'react'
import MenuItem from '../MenuItem'
import style from './sidebar.module.css'
import logoImageSource from 'assets/logo.png'
import Telegram from 'assets/telegram.png'
import Twitter from 'assets/twitter.png'
import Image from 'next/image'
import Link from 'next/link'

interface SidebarProps {
  menuItems: string[]
}

const Sidebar = ({ menuItems }: SidebarProps): FunctionComponent<SidebarProps> =>
  <aside className={style.aside} role='complementary'>
    <div>
      <section className={style.section}>
        <Link href='/'>
          <Image className={style.image} src={logoImageSource} alt='PayButton' width={140} height={26} />
        </Link>
      </section>
      <nav>
        <ul className={style.ul}>
          {menuItems.map(itemName =>
            <MenuItem key={itemName.name} name={itemName.name} image={itemName.image} />
          )}
        </ul>
      </nav>
    </div>
    <div className={style.socialctn}>
      <a href='https://t.me/paybutton' target="_blank" rel="noreferrer noopener">
        <Image src={Telegram} alt='telegram' width={20} height={20} />
      </a>
      <a href='https://twitter.com/thepaybutton' target="_blank" rel="noreferrer noopener">
        <Image src={Twitter} alt='twitter' width={20} height={20} />
      </a>
    </div>
  </aside>

export default Sidebar
