import React, { FunctionComponent } from 'react'
import MenuItem from '../MenuItem'
import style from './sidebar.module.css'
import logoImageSource from 'assets/logo.png'
import Image from 'next/image'
import Link from 'next/link'

interface SidebarProps {
  menuItems: string[]
}

const Sidebar = ({ menuItems }: SidebarProps): FunctionComponent<SidebarProps> =>
  <aside className={style.aside} role='complementary'>
    <section>
      <Link href='/'>
        <Image className={style.image} src={logoImageSource} alt='PayButton' width={130} height={30} />
      </Link>
    </section>
    <nav>
      <ul className={style.ul}>
        {menuItems.map(itemName =>
          <MenuItem key={itemName} name={itemName} />
        )}
      </ul>
    </nav>
  </aside>

export default Sidebar
