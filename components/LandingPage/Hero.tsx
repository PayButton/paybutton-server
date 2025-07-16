import Link from 'next/link'
import Image from 'next/image'
import style from '../../styles/landing.module.css'
import button from '../../assets/button-pointer.png'
import Wave from '../../assets/wave.svg'
import Blocks from '../../assets/blocks.png'

export default function Hero (): JSX.Element {
  return (
    <div className={style.hero_ctn}>
      <div className={style.container}>
        <div className={style.col_ctn}>
          <div className={style.col}>
            <h1>
              The easiest way to accept <span>eCash</span> online
            </h1>
            <p>
              Start accepting XEC or BCH on your website with only a few lines
              of code. No complex setup, no hidden fees, just simple and secure
              payments.
            </p>
            <div className={style.hero_features}>
              <span>⚡ Fast</span>
              <span>🔒 Secure</span>
              <span>💰 Low fees</span>
            </div>
            <div className={style.button_ctn}>
              <Link href="/signup" className="button_main">
                Sign up for free
              </Link>
            </div>
          </div>
          <div className={`${style.col} ${style.image_col}`}>
            <Image src={button} alt="PayButton" />
          </div>
        </div>
      </div>
      <Image src={Wave} alt="wave" className={style.wave} />
      <div className={style.blocks}>
        <Image src={Blocks} alt="paybutton" />
      </div>
    </div>
  )
}
