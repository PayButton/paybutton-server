import React, { FunctionComponent } from 'react'
import Layout from 'components/Layout'

interface PageProps {
  children: React.ReactNode
}

const Page = ({ children }: PageProps): FunctionComponent<PageProps> =>
    <Layout>
      {children}
    </Layout>

export default Page
