import Link from 'next/link'
import style from 'styles/landing.module.css'

export default function CTASection (): JSX.Element {
  return (
    <div className={style.cta_ctn}>
      <div className={style.container}>
        <div className={style.cta_content}>
          <h2>
            Ready to Start Accepting <span>eCash</span>?
          </h2>
          <p>
            Join hundreds of developers and businesses already using PayButton
            to accept eCash payments. Get started in minutes with our simple
            setup process.
          </p>
          <div className={style.cta_buttons}>
            <Link href="/signup" className="button_main button_large">
              Get Started Free
            </Link>
            <Link
              href="https://docs.paybutton.org"
              target="_blank"
              className="button_outline button_large"
            >
              View Documentation
            </Link>
          </div>
          <div className={style.cta_features}>
            <div className={style.cta_feature}>
              <span className={style.cta_check}>✓</span>
              <span>No setup fees</span>
            </div>
            <div className={style.cta_feature}>
              <span className={style.cta_check}>✓</span>
              <span>Instant activation</span>
            </div>
            <div className={style.cta_feature}>
              <span className={style.cta_check}>✓</span>
              <span>Easy to use</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
