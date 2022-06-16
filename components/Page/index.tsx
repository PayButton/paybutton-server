import React, { FunctionComponent } from 'react'
import style from './page.module.css'

interface PageProps {
  header: React.ReactNode
  children: React.ReactNode
}

const Page = ({ header, children }: PageProps): FunctionComponent<PageProps> =>
  <>
    <header className={style.header}>
      {header}
    </header>
    <article className={style.article}>
      {children}
    </article>
  </>

export default Page
