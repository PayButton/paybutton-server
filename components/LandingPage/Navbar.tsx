import Link from 'next/link';
import Image from 'next/image';
import style from '/styles/landing.module.css';
import logoImageSource from 'assets/logo.png';
import dynamic from 'next/dynamic';
const ThemeToggle = dynamic(
  async () => await import('/components/Sidebar/themetoggle'),
  {
    ssr: false,
  }
);

export default function Navbar(): JSX.Element {
  return (
    <div className={style.navbar_ctn}>
      <div className={style.navbar_inner}>
        <Image src={logoImageSource} alt="PayButton" />
        <div className={style.navlink_ctn}>
          <ThemeToggle landingpage />
          <Link href="https://paybutton.org/#/?id=what-is-paybutton">Docs</Link>
          <Link href="/auth">Sign In</Link>
          <Link href="/auth" className={`${style.button} ${style.sm}`}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
