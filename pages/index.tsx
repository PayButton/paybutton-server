import style from '../styles/landing.module.css'
import Navbar from 'components/LandingPage/Navbar'
import Hero from 'components/LandingPage/Hero'
import Dashboard from 'components/LandingPage/Dashboard'
import WordPressSection from 'components/LandingPage/WordPressSection'
import FeaturesSection from 'components/LandingPage/FeaturesSection'
import CTASection from 'components/LandingPage/CTASection'
import Footer from 'components/LandingPage/Footer'
import dynamic from 'next/dynamic'
import supertokensNode from 'supertokens-node'
import * as SuperTokensConfig from '../config/backendConfig'
import { GetServerSideProps } from 'next'
import { frontEndGetSession } from 'utils/setSession'

const DynamicButtonGenerator = dynamic(
  async () => await import('components/ButtonGenerator/index'),
  {
    ssr: true
  }
)

export const getServerSideProps: GetServerSideProps = async (context) => {
  // this runs on the backend, so we must call init on supertokens-node SDK
  supertokensNode.init(SuperTokensConfig.backendConfig())
  const sessionResult = await frontEndGetSession(context)
  if (!sessionResult.success) {
    return sessionResult.failedResult.payload
  }
  const session = sessionResult.session
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
      <FeaturesSection />
      <Dashboard />
      <WordPressSection />
      <DynamicButtonGenerator />
      <CTASection />
      <Footer userId={userId} />
    </div>
  )
}
