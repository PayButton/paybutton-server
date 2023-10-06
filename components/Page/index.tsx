import React from 'react'
import Layout from 'components/Layout'
import { UserProfile } from '@prisma/client'
import { NO_LAYOUT_ROUTES } from 'constants/index'
import { useRouter } from 'next/router'

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
  loggedUser
}: PageProps): JSX.Element => {
  const router = useRouter()
  const currentRoute = router.pathname

  return <>
    {(loggedUser === undefined || NO_LAYOUT_ROUTES.includes(currentRoute))
      ? children
      : (
          <Layout chart={chart} setChart={setChart} loggedUser={loggedUser}>
            {children}
          </Layout>
        )
    }
  </>
}

export default Page
