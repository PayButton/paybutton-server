import React, { useState, useEffect } from "react";
import style from './sidebar.module.css'

const ThemeToggle = ({chart, setChart}) => {

    const [activeTheme, setActiveTheme] = useState(document.body.dataset.theme);
    const inactiveTheme = activeTheme === "light" ? "dark" : "light";
    const [childchart, setChildChart] = useState(chart);

    useEffect(() => {
        document.body.dataset.theme = activeTheme;
        window.localStorage.setItem("theme", activeTheme);
      }, [activeTheme]);

      useEffect(() => {
       setChart(!chart)
      }, [childchart]);
    
    return (
        <button 
            aria-label={`Change to ${inactiveTheme} mode`}
            title={`Change to ${inactiveTheme} mode`}
            type="button"
            onClick={() => {setActiveTheme(inactiveTheme); setChildChart(!childchart)}}
            className={style.darkmode_btn}
        >
            <span className={activeTheme === "dark" ? `${style.switch}`:null}></span>
        </button>
    );
  };
  
export default ThemeToggle;