import Head from 'next/head'
import Image from 'next/image'
import logoImageSource from 'assets/logo.png'
import SignIn from 'components/Auth/SignIn'
import style from 'styles/signin.module.css'
import * as SuperTokensConfig from '../../config/backendConfig'
import supertokensNode from 'supertokens-node'
import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async (_) => {
  // this runs on the backend, so we must call init on supertokens-node SDK
  supertokensNode.init(SuperTokensConfig.backendConfig())
  return { props: {} }
}

export default function Signin (): JSX.Element {
  return (
    <div>
      <Head>
        <title>PayButton | Sign In</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={style.login_ctn}>
        <Image src={logoImageSource} alt='PayButton' />
        <div className={style.login_box}>
          <SignIn/>
        </div>
      </div>
    </div>
  )
}
