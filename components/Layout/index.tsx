import React, { FunctionComponent } from 'react'
import Sidebar from '../Sidebar'
import style from './layout.module.css'

interface LayoutProps {
  children: React.ReactNode
  menuItems: string[]
}

const Layout = (props: LayoutProps): FunctionComponent<LayoutProps> =>
  <div className={style.layout}>
    <Sidebar menuItems={props.menuItems} />
    <main>
      {props.children}
    </main>
  </div>

export default Layout
