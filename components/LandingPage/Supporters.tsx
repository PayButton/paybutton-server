import Link from 'next/link';
import style from '/styles/landing.module.css';

export default function Supporters(): JSX.Element {
  return (
    <div className={style.supporters_ctn}>
      <div className={style.container}>
        <h2>Our Supporters</h2>
        <p>
          PayButton is a community-driven open-source initiative. Contributions
          from the community are crucial to the success of the project.
        </p>
        <h3>Gold Supporters | $1,200 +</h3>
        <div className={style.supporter}>Your Logo Here!</div>
        <h3>Silver Supporters | $600 - $1,200</h3>
        <div className={style.supporter}>Your Logo Here!</div>
        <br />
        <Link
          href="mailto:contact@paybutton.org?subject=Become%a%Supporter"
          className={style.button}
        >
          Become a Supporter
        </Link>
      </div>
    </div>
  );
}
