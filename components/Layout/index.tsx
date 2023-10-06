import React from 'react'
import Sidebar from '../Sidebar'
import style from './layout.module.css'

interface LayoutProps {
  children: React.ReactNode
}

const Layout = (props: LayoutProps): JSX.Element =>
  <div className={style.layout}>
    <Sidebar chart={props.chart} setChart={props.setChart} loggedUser={props.loggedUser} />
    <main>
      {props.children}
    </main>
  </div>

export default Layout
