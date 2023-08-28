import { useState, useEffect } from 'react';
import Image from 'next/image';
import style from './sidebar.module.css';
import Sun from '/assets/sun.png';
import Moon from '/assets/moon.png';

const ThemeToggle = ({ chart, setChart, landingpage }) => {
  const [activeTheme, setActiveTheme] = useState(document.body.dataset.theme);
  const inactiveTheme = activeTheme === 'light' ? 'dark' : 'light';
  const [childchart, setChildChart] = useState(landingpage ? null : chart);

  useEffect(() => {
    document.body.dataset.theme = activeTheme;
    window.localStorage.setItem('theme', activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    if (landingpage) {
      return;
    } else setChart(!chart);
  }, [childchart]);

  return (
    <div
      className={style.toggle_ctn}
      onClick={() => {
        setActiveTheme(inactiveTheme);
        setChildChart(!childchart);
      }}
    >
      <Image
        src={Sun}
        alt="light-mode"
        className={
          activeTheme === 'dark' ? `${style.sun} ${style.hide}` : `${style.sun}`
        }
      />
      <Image
        src={Moon}
        alt="dark-mode"
        className={
          activeTheme === 'light'
            ? `${style.moon} ${style.hide}`
            : `${style.moon}`
        }
      />
      <div className={style.tooltiptext}>
        {activeTheme === 'dark' ? 'Light mode' : 'Dark mode'}
      </div>
    </div>
  );
};

export default ThemeToggle;
