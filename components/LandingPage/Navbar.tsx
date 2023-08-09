import Link from 'next/link';
import Image from 'next/image';
import style from '/styles/landing.module.css';
import logoImageSource from 'assets/logo.png';

export default function Navbar(): JSX.Element {
  return (
    <div className={style.navbar_ctn}>
      <Image src={logoImageSource} alt="PayButton" />
      <div className={style.navlink_ctn}>
        <Link href="https://paybutton.org/#/?id=what-is-paybutton">Docs</Link>
        <Link href="#button-generator">Button Generator</Link>
        <Link href="/auth">Sign In</Link>
        <Link href="/auth" className={`${style.button} ${style.sm}`}>
          Sign up
        </Link>
      </div>
    </div>
  );
}
