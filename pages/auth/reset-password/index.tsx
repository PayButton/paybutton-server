import Head from 'next/head'
import ResetPassword from 'components/Auth/ResetPassword'

export default function Home (): JSX.Element {
  return (
    <div>
      <Head>
        <title>PayButton</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className='login_ctn'>
      <ResetPassword/>
      </div>
    </div>
  )
}
