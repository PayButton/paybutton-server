import { useEffect, useState } from 'react';
import Image from 'next/image';
import style from './button-generator.module.css';
import CopyIcon from '/assets/copy.png';

export default function CodeBlock({ button }): JSX.Element {
  const [isCopied, setIsCopied] = useState(false);
  const [codeType, setCodeType] = useState('HTML');
  const [code, setCode] = useState({
    html: '',
    javascript: '',
    react: '',
  });

  const codetypes = ['HTML', 'JavaScript', 'React'];

  const handleCopyClick = async (): Promise<void> => {
    const codeToCopy =
      codeType === 'HTML'
        ? code.html
        : codeType === 'JavaScript'
        ? code.javascript
        : code.react;

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

  useEffect(() => {
    setCode({
      html: `<script src="https://unpkg.com/@paybutton/paybutton/dist/paybutton.js"></script>

<div
  class="paybutton"
  to="${button.to}"
  text="${button.text}"
  hover-text="${button.hoverText}"
  success-text="${button.successText}"
  amount=${button.amount}
  currency="${button.currency}"
  animation="${button.animation}"
  theme='${JSON.stringify(button.theme)}'
/>`,
      javascript: `<script src="https://unpkg.com/@paybutton/paybutton/dist/paybutton.js"></script>

<div id="my_button"></div>
      
<script>      
  var config = {
    to: '${button.to}',
    text: '${button.text}',
    hoverText: '${button.hoverText}',
    successText: '${button.successText}',
    amount: ${button.amount},
    currency: '${button.currency}',
    animation: '${button.animation}',
    theme: ${JSON.stringify(button.theme)},
  };

  PayButton.render(document.getElementById('my_button'), config);
</script>`,
      react: `npm i --save @paybutton/react

import { PayButton } from '@paybutton/react'

function App() {
  const to = '${button.to}'
  const text = '${button.text}'
  const hoverText = '${button.hoverText}'
  const successText = '${button.successText}'
  const amount = ${button.amount}
  const currency = '${button.currency}'
  const animation = '${button.animation}'
  const theme = {
    palette: {
      primary: '${button.theme.palette.primary}',
      secondary: '${button.theme.palette.secondary}',
      tertiary: '${button.theme.palette.tertiary}'
    }
  }

  return <PayButton
    to={to}
    text={text}
    hoverText={hoverText}
    amount={amount}
    currency={currency}
    animation={animation}
    theme={theme}
  />
}`,
    });
  }, [button]);

  return (
    <>
      <div className={style.codetopbar}>
        <div className={style.tabsctn}>
          {codetypes.map((item, index) => (
            <div
              key={index}
              onClick={() => setCodeType(item)}
              style={
                codeType === item
                  ? { background: '#669cfe', color: '#231f20' }
                  : null
              }
            >
              {item}
            </div>
          ))}
        </div>
        <div className={style.copybutton} onClick={handleCopyClick}>
          <Image src={CopyIcon} alt="copy" />
          {isCopied ? 'Copied!' : 'Copy'}
        </div>
      </div>
      <pre className={style.code_ctn}>
        <code>
          {codeType === 'HTML'
            ? code.html
            : codeType === 'JavaScript'
            ? code.javascript
            : code.react}
        </code>
      </pre>
    </>
  );
}
