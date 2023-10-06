import style from '../styles/landing.module.css'
import Navbar from 'components/LandingPage/Navbar'
import Hero from 'components/LandingPage/Hero'
import Dashboard from 'components/LandingPage/Dashboard'
import Footer from 'components/LandingPage/Footer'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../config/backendConfig'
import Session from 'supertokens-node/recipe/session'
import { GetServerSideProps } from 'next'

const DynamicButtonGenerator = dynamic(
  async () => await import('components/ButtonGenerator'),
  {
    ssr: false
  }
)

export const getServerSideProps: GetServerSideProps = async (context) => {
  // this runs on the backend, so we must call init on supertokens-node SDK
  supertokensNode.init(SuperTokensConfig.backendConfig())
  let session
  try {
    session = await Session.getSession(context.req, context.res)
  } catch (err: any) {
    if (err.type === Session.Error.TRY_REFRESH_TOKEN) {
      return { props: { fromSupertokens: 'needs-refresh' } }
    } else if (err.type === Session.Error.UNAUTHORISED) {
      return { props: {} }
    } else {
      throw err
    }
  }
  if (session === undefined) return { props: {} }
  const userId = session?.getUserId()

  return {
    props: {
      userId
    }
  }
}

interface IProps {
  userId?: string
}

export default function LandingPage ({ userId }: IProps): JSX.Element {
  return (
    <div className={style.landing_ctn}>
      <Navbar userId={userId} />
      <Hero />
      <Dashboard />
      <DynamicButtonGenerator />
      <Footer />
    </div>
  )
}
