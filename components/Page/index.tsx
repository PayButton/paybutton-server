import React, { FunctionComponent } from 'react'
import Layout from 'components/Layout'

interface PageProps {
  children: React.ReactNode
  chart: boolean
}

const Page = ({ children, chart, setChart }: PageProps): FunctionComponent<PageProps> =>
    <Layout chart={chart} setChart={setChart}>
      {children}
    </Layout>

export default Page
