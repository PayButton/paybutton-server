import style from '../styles/landing.module.css';
import Navbar from '/components/LandingPage/Navbar';
import Hero from '/components/LandingPage/Hero';
import Dashboard from '/components/LandingPage/Dashboard';
import Footer from '/components/LandingPage/Footer';
import dynamic from 'next/dynamic';

const DynamicButtonGenerator = dynamic(
  () => import('/components/ButtonGenerator'),
  {
    ssr: false,
  }
);

export default function LandingPage(): JSX.Element {
  return (
    <div className={style.landing_ctn}>
      <Navbar />
      <Hero />
      <Dashboard />
      <DynamicButtonGenerator />
      <Footer />
    </div>
  );
}
