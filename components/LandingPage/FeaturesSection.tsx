import style from 'styles/landing.module.css'

export default function FeaturesSection (): JSX.Element {
  return (
    <div className={style.features_ctn}>
      <div className={style.container}>
        <div className={style.features_header}>
          <h2>
            Why Choose <span>PayButton</span>?
          </h2>
          <p>
            The most reliable and user-friendly way to accept eCash payments
            online
          </p>
        </div>
        <div className={style.features_grid}>
          <div className={style.feature_card}>
            <div className={style.feature_icon_wrapper}>
              <div className={style.feature_icon}>⚡</div>
            </div>
            <h3>Lightning Fast</h3>
            <p>
              Instant payment processing with eCash's fast blockchain. No
              waiting for confirmations or dealing with slow traditional payment
              methods.
            </p>
          </div>
          <div className={style.feature_card}>
            <div className={style.feature_icon_wrapper}>
              <div className={style.feature_icon}>🔒</div>
            </div>
            <h3>Secure & Private</h3>
            <p>
              Built on eCash's secure blockchain with privacy features. Your
              customers' payment data stays private and secure.
            </p>
          </div>
          <div className={style.feature_card}>
            <div className={style.feature_icon_wrapper}>
              <div className={style.feature_icon}>💰</div>
            </div>
            <h3>Low Fees</h3>
            <p>
              Minimal transaction fees compared to traditional payment
              processors. Keep more of your revenue with eCash's efficient
              network.
            </p>
          </div>

          <div className={style.feature_card}>
            <div className={style.feature_icon_wrapper}>
              <div className={style.feature_icon}>🛠️</div>
            </div>
            <h3>Easy Integration</h3>
            <p>
              Simple code snippets, WordPress plugin, and comprehensive
              documentation make integration effortless.
            </p>
          </div>
        </div>

        <div className={style.use_cases}>
          <h3>Perfect for:</h3>
          <div className={style.use_cases_features}>
            <span>🛒 E-commerce</span>
            <span>📝 Content Creators</span>
            <span>🎓 Online Courses</span>
            <span>🎨 Digital Downloads</span>
            <span>🎁 Donations</span>
            <span>🔧 Freelancers</span>
          </div>
        </div>
      </div>
    </div>
  )
}
