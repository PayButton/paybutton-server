import Image from 'next/image'
import style from 'styles/landing.module.css'
import DashboardScreen from 'assets/dashboard-light.png'
import DashboardScreenDark from 'assets/dashboard-dark.png'
import Wave from 'assets/wave2.svg'

export default function Dashboard (): JSX.Element {
  return (
    <div className={style.dashboard_ctn}>
      <div className={style.container}>
        <h2>
          Dashboard
        </h2>
        <p>
          Track transactions and revenue through the PayButton dashboard. Create
          wallets and manage your buttons to organize payments across all of
          your websites.
        </p>
        <div className={style.dashboard_img}>
          <Image
            src={DashboardScreen}
            alt="PayButton Dashboard"
            className={style.dashboard_img_light}
          />
          <Image
            src={DashboardScreenDark}
            alt="PayButton Dashboard"
            className={style.dashboard_img_dark}
          />
        </div>
      </div>
      <Image src={Wave} alt="wave" className={style.wave2} />
      <div className={style.whitebackground} />
    </div>
  )
}
