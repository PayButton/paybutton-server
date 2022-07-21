import React, { useState, useEffect } from "react";
import style from './sidebar.module.css'

const ThemeToggle = () => {

    const [activeTheme, setActiveTheme] = useState(document.body.dataset.theme);
    const inactiveTheme = activeTheme === "light" ? "dark" : "light";

    useEffect(() => {
        document.body.dataset.theme = activeTheme;
        window.localStorage.setItem("theme", activeTheme);
      }, [activeTheme]);
    
    return (
        <button 
            aria-label={`Change to ${inactiveTheme} mode`}
            title={`Change to ${inactiveTheme} mode`}
            type="button"
            onClick={() => setActiveTheme(inactiveTheme)}
            className={style.darkmode_btn}
        >
            <span className={activeTheme === "dark" ? `${style.switch}`:null}></span>
        </button>
    );
  };
  
export default ThemeToggle;