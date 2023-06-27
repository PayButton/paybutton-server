import React, { FunctionComponent } from 'react'
import Layout from 'components/Layout'

interface PageProps {
  children: React.ReactNode
  chart: boolean
}

const Page = ({ children, chart, setChart, loggedin }: PageProps): FunctionComponent<PageProps> => {
  console.log('oia a page', loggedin)
  return (
    <Layout chart={chart} setChart={setChart} loggedin={loggedin}>
      {children}
    </Layout>
  )
}

export default Page
