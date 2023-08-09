import Link from 'next/link';
import Image from 'next/image';
import style from '/styles/landing.module.css';
import button from 'assets/button-pointer.png';
import Wave from 'assets/wave.svg';
import Rectangle from 'assets/rectangle.png';

export default function Hero(): JSX.Element {
  return (
    <div className={style.hero_ctn}>
      <div className={style.container}>
        <div className={style.col_ctn}>
          <div className={style.col}>
            <h1>
              The easiest way to accept <span>eCash</span> online
            </h1>
            <p>
              Simply add a few lines of code to start accepting eCash on your
              website
            </p>
            <div className={style.button_ctn}>
              <Link href="/auth" className={style.button}>
                Sign up for free
              </Link>
              <Link href="/">Create a button</Link>
            </div>
          </div>
          <div className={`${style.col} ${style.image_col}`}>
            <Image src={button} alt="PayButton" />
          </div>
        </div>
      </div>
      <Image src={Wave} alt="wave" className={style.wave} />
      <Image src={Rectangle} alt="paybutton" className={style.rectangle} />
    </div>
  );
}
