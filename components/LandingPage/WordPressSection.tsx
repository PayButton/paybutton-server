import Link from 'next/link'
import Image from 'next/image'
import style from 'styles/landing.module.css'
import WordPressPayButton from 'assets/wordpress-paybutton.png'

export default function WordPressSection (): JSX.Element {
  return (
    <div className={style.wordpress_ctn} id="wordpress">
      <div className={style.container}>
        <div className={style.wordpress_content}>
          <div className={style.wordpress_text}>
            <h2>
              WordPress <span>Plugin</span>
            </h2>
            <p>
              Integrate PayButton seamlessly into your WordPress site or
              WooCommerce store with our official plugin. Accept eCash
              payments with just a few clicks - no coding required.
            </p>
            <div className={style.wordpress_features}>
              <div className={style.feature_item}>
                <div className={style.feature_icon}>🚀</div>
                <div>
                  <h4>Easy Setup</h4>
                  <p>Install and configure in minutes</p>
                </div>
              </div>
              <div className={style.feature_item}>
                <div className={style.feature_icon}>🎨</div>
                <div>
                  <h4>Customizable</h4>
                  <p>Match your site's design perfectly</p>
                </div>
              </div>
              <div className={style.feature_item}>
                <div className={style.feature_icon}>📊</div>
                <div>
                  <h4>Analytics</h4>
                  <p>Track payments and revenue</p>
                </div>
              </div>
            </div>
            <div className={style.wordpress_buttons}>
              <Link
                href="https://wordpress.org/plugins/paybutton/"
                target="_blank"
                className="button_main"
              >
                Get Plugin
              </Link>
            </div>
          </div>
          <div className={style.wordpress_visual}>
            <Image
              src={WordPressPayButton}
              alt="WordPress PayButton Plugin Interface"
              width={450}
              height={300}
              className={style.wordpress_image}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
