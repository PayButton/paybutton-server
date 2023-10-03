import React, { FunctionComponent } from 'react'
import Layout from 'components/Layout'
import { UserProfile } from '@prisma/client'

interface PageProps {
  children: React.ReactNode
  chart: boolean
  setChart: Function
  loggedUser: UserProfile
  isAdmin: boolean
}

const Page = ({
  children,
  chart,
  setChart,
  loggedUser,
  isAdmin
}: PageProps): FunctionComponent<PageProps> => (
  <>
    {loggedUser !== undefined
      ? (
      <Layout chart={chart} setChart={setChart} loggedUser={loggedUser}>
        {children}
      </Layout>
        )
      : (
          children
        )}
  </>
)

export default Page
