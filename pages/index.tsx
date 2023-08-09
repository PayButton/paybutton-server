import Navbar from '/components/LandingPage/Navbar';
import Hero from '/components/LandingPage/Hero';
import style from '/styles/landing.module.css';

export default function LandingPage(): JSX.Element {
  return (
    <div className={style.landing_ctn}>
      <Navbar />
      <Hero />
    </div>
  );
}
