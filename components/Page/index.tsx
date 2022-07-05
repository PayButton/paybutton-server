import React, { FunctionComponent } from 'react'
import style from './page.module.css'

interface PageProps {
  header: React.ReactNode
  children: React.ReactNode
}

const Page = ({ children }: PageProps): FunctionComponent<PageProps> =>
    <article className={style.article}>
      {children}
    </article>

export default Page
