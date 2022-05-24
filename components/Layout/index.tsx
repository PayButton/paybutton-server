import React from "react"
import Sidebar from '../Sidebar'

type LayoutProps = {
  children: React.ReactNode
  menuItems: string[]
  logoImageSource: string
}

const Layout = (props : LayoutProps) =>
  <div className="layout">
    <Sidebar logoImageSource={props.logoImageSource} menuItems={props.menuItems} />
    <main>
      {props.children}
    </main>
  </div>

export default Layout

