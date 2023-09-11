import Link from 'next/link';
import Image from 'next/image';
import style from '/styles/landing.module.css';
import logoImageSource from 'assets/logo.png';

export default function Footer(): JSX.Element {
  const currentYear = new Date().getFullYear();
  const copyrightSymbol = '\u00A9';
  return (
    <div className={style.footer_ctn}>
      <div className={style.container}>
        <div className={style.footer}>
          <Image src={logoImageSource} alt="PayButton" />
          <div className={style.footerlink_ctn}>
            <Link href="#button-generator">Button Generator</Link>
            <Link
              href="https://github.com/paybutton"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </Link>
            <Link
              href="https://t.me/paybutton"
              target="_blank"
              rel="noopener noreferrer"
            >
              Telegram
            </Link>
            <Link href="https://docs.paybutton.org/#/?id=what-is-paybutton">
              Docs
            </Link>
            <Link href="/signin">Sign In</Link>
            <Link href="/signup" className="button_outline button_small">
              Sign up
            </Link>
          </div>
        </div>
        <div className={style.copyright}>
          {copyrightSymbol}
          {currentYear} PayButton.org. All Rights Reserved.
        </div>
      </div>
    </div>
  );
}
