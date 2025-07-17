import Image from 'next/image'
import style from 'styles/landing.module.css'
import DashboardScreen from 'assets/dashboard-light.png'
import DashboardScreenDark from 'assets/dashboard-dark.png'

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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 181"
        className={style.wave2}
      >
        <path
          fill="var(--wave-fill-color, #e5e4e4)"
          fillOpacity="1"
          d="M 0 160 L 80 149.3 C 160 139 320 117 480 122.7 C 640 128 800 160 960 170.7 C 1120 181 1280 171 1440 117 L 1440 181 L 0 181 Z"
        />
      </svg>
      <div className={style.whitebackground} />
    </div>
  )
}
