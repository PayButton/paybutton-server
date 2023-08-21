import style from '/styles/landing.module.css';
import Navbar from '/components/LandingPage/Navbar';
import Hero from '/components/LandingPage/Hero';
import Dashboard from '/components/LandingPage/Dashboard';
import ButtonGenerator from '/components/ButtonGenerator';
import Footer from '/components/LandingPage/Footer';

export default function LandingPage(): JSX.Element {
  return (
    <div className={style.landing_ctn}>
      <Navbar />
      <Hero />
      <Dashboard />
      <ButtonGenerator />
      <Footer />
    </div>
  );
}
