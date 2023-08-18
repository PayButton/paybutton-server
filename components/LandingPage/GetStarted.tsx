import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import style from '/styles/landing.module.css';
import CopyIcon from '/assets/copy.png';

export default function GetStarted(): JSX.Element {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyClick = async (): Promise<void> => {
    const codeToCopy = `<script src="https://unpkg.com/@paybutton/paybutton/dist/paybutton.js"></script>
    <div class="paybutton" to="YOUR_ADDRESS_HERE"></div>`;

    try {
      await navigator.clipboard.writeText(codeToCopy);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 1000); // Reset the "Copied" state after 2 seconds
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <div className={style.get_started_ctn}>
      <div className={style.container}>
        <h2 className={style.heading2}>Get Started</h2>
        <p className={style.centerp}>
          Simply add the following to your website’s HTML, replacing{' '}
          <i>YOUR_ADDRESS_HERE</i> with your eCash address.
        </p>
        <div className={style.codetopbar}>
          <div className={style.copybutton} onClick={handleCopyClick}>
            <Image src={CopyIcon} alt="copy" />
            {isCopied ? 'Copied!' : 'Copy'}
          </div>
        </div>
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
          className="button_outline"
        >
          More Information
        </Link>
      </div>
    </div>
  );
}
