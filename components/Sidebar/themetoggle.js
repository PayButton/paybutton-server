import React, { useState, useEffect } from "react";

const ThemeToggle = () => {

    const [activeTheme, setActiveTheme] = useState(document.body.dataset.theme);
    const inactiveTheme = activeTheme === "light" ? "dark" : "light";

    useEffect(() => {
        document.body.dataset.theme = activeTheme;
        window.localStorage.setItem("theme", activeTheme);
        console.log('click')
      }, [activeTheme]);
    
    return (
      <button onClick={() => setActiveTheme(inactiveTheme)}>{activeTheme}</button>
    );
  };
  
export default ThemeToggle;