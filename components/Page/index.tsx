import React from 'react'
import style from './page.module.css'

type PageProps = {
  header: React.ReactNode,
  children: React.ReactNode
}

const Page = ({ header, children } : PageProps) =>
  <>
    <header className={style.header}>
     {header}
    </header>
    <article className={style.article}>
      {children}
    </article>
  </>

export default Page

