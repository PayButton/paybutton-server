import style from '/styles/landing.module.css';
import Navbar from '/components/LandingPage/Navbar';
import Hero from '/components/LandingPage/Hero';
import Dashboard from '/components/LandingPage/Dashboard';
import Supporters from '/components/LandingPage/Supporters';

export default function LandingPage(): JSX.Element {
  return (
    <div className={style.landing_ctn}>
      <Navbar />
      <Hero />
      <Dashboard />
      <Supporters />
    </div>
  );
}
