import React, { FunctionComponent } from 'react'
import Layout from 'components/Layout'

interface PageProps {
  children: React.ReactNode
  chart: boolean
  setChart: Function
  loggedUserId: string
}

const Page = ({
  children,
  chart,
  setChart,
  loggedUserId
}: PageProps): FunctionComponent<PageProps> => (
  <>
    {loggedUserId !== undefined
      ? (
      <Layout chart={chart} setChart={setChart} loggedUserId={loggedUserId}>
        {children}
      </Layout>
        )
      : (
          children
        )}
  </>
)

export default Page
