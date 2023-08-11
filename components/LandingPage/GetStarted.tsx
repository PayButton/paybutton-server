import Link from 'next/link';
import style from '/styles/landing.module.css';

export default function GetStarted(): JSX.Element {
  return (
    <div className={style.get_started_ctn}>
      <div className={style.container}>
        <h2 className={style.heading2}>Get Started</h2>
        <p className={style.centerp}>
          Simply add the following to your website’s HTML, replacing
          <span className={style.your_address}>YOUR_ADDRESS_HERE</span> with
          your eCash address.
        </p>
        <pre>
          <code>
            &lt;script
            src="https://unpkg.com/@paybutton/paybutton/dist/paybutton.js"&gt;&lt;/script&gt;
            <br />
            &lt;div class="paybutton" to="YOUR_ADDRESS_HERE"&gt;&lt;/div&gt;
          </code>
        </pre>
        <Link
          href="https://paybutton.org/#/?id=what-is-paybutton"
          className={style.button}
        >
          More Information
        </Link>
      </div>
    </div>
  );
}
