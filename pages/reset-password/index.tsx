import Head from 'next/head'
import ForgotPassword from 'components/Auth/ForgotPassword'
import style from 'styles/signin.module.css'
import Image from 'next/image'
import logoImageSource from 'assets/logo.png'

export default function ResetPW (): JSX.Element {
  return (
    <div>
      <Head>
        <title>PayButton</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={style.login_ctn}>
        <Image src={logoImageSource} alt='PayButton' />
        <div className={style.login_box}>
        <ForgotPassword />
        </div>
      </div>
    </div>
  )
}
