import Link from 'next/link';
import Image from 'next/image';
import style from '/styles/landing.module.css';
import DashboardScreen from 'assets/dashboard-light.png';
import Wave from 'assets/wave2.svg';

export default function Dashboard(): JSX.Element {
  return (
    <div className={style.dashboard_ctn}>
      <div className={style.container}>
        <h2>
          Dashboard<span>New!</span>
        </h2>
        <p>
          Track transactions and revenue through the PayButton dashboard. Create
          wallets and manage your buttons to organize payments across all of
          your websites.
        </p>
        <div className={style.dashboard_img}>
          <Image src={DashboardScreen} alt="PayButton Dashboard" />
        </div>
        <Link href="/auth" className={style.button}>
          Get an Account
        </Link>
      </div>
      <Image src={Wave} alt="wave" className={style.wave2} />
      <div className={style.whitebackground} />
    </div>
  );
}
