import React from "react"
import Sidebar from '../Sidebar'
import style from './layout.module.css'

type LayoutProps = {
  children: React.ReactNode
  menuItems: string[]
  logoImageSource: string
}

const Layout = (props : LayoutProps) =>
  <div className={style.layout}>
    <Sidebar logoImageSource={props.logoImageSource} menuItems={props.menuItems} />
    <main>
      {props.children}
    </main>
  </div>

export default Layout

