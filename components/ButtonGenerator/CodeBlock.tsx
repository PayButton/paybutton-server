import { useEffect, useState } from 'react';
import Image from 'next/image';
import style from './button-generator.module.css';
import CopyIcon from '/assets/copy.png';
import Prism from 'prismjs';
import 'prismjs/themes/prism-okaidia.css';
import 'prismjs/components/prism-jsx.min';

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

  const checkValue = (value, attribute, type) => {
    if (type === 'html') {
      if (value !== undefined && value !== '') {
        if (attribute === 'amount') {
          return `\n  ${attribute}=${value}`;
        } else return `\n  ${attribute}="${value}"`;
      } else return '';
    } else if (type === 'js') {
      if (value !== undefined && value !== '') {
        if (attribute === 'amount') {
          return `\n    ${attribute}: ${value},`;
        } else return `\n    ${attribute}: "${value}",`;
      } else return '';
    } else {
      if (value !== undefined && value !== '') {
        if (attribute === 'amount') {
          return `\n  const ${attribute} = ${value}`;
        } else return `\n  const ${attribute} = '${value}'`;
      } else return '';
    }
  };

  const checkAnimation = (value, type) => {
    if (value === 'slide') {
      return '';
    } else if (type === 'html') {
      return `\n  animation="${value}"`;
    } else if (type === 'js') {
      return `\n    animation: "${value}",`;
    } else {
      return `\n  const animation = '${value}'`;
    }
  };

  const checkCurrency = (value, type) => {
    if (value === 'XEC' || value === 'BCH') {
      return '';
    } else if (type === 'html') {
      return `\n  currency="${value}"`;
    } else if (type === 'js') {
      return `\n    currency: "${value}",`;
    } else {
      return `\n  const currency = '${value}'`;
    }
  };

  const primaryXEC = '#0074C2';
  const secondaryXEC = '#FFFFFF';
  const tertiaryXEC = '#231f20';

  const primaryBCH = '#4bc846';
  const secondaryBCH = '#FFFFFF';
  const tertiaryBCH = '#231f20';

  const checkTheme = (value, type) => {
    if (
      (value.palette.primary === primaryXEC &&
        value.palette.secondary === secondaryXEC &&
        value.palette.tertiary === tertiaryXEC) ||
      (value.palette.primary === primaryBCH &&
        value.palette.secondary === secondaryBCH &&
        value.palette.tertiary === tertiaryBCH)
    ) {
      return '';
    } else if (type === 'html') {
      return `\n  theme='${JSON.stringify(value)}'`;
    } else if (type === 'js') {
      return `\n    theme: ${JSON.stringify(value)}`;
    } else {
      return `\n  const theme = {
        palette: {
          primary: '${value.palette.primary}',
          secondary: '${value.palette.secondary}',
          tertiary: '${value.palette.tertiary}'
        }
      }`;
    }
  };

  useEffect(() => {
    setCode({
      html: `<script src="https://unpkg.com/@paybutton/paybutton/dist/paybutton.js"></script>

<div
  class="paybutton"
  to="${button.to}"${checkValue(button.text, 'text', 'html')}${checkValue(
        button.hoverText,
        'hover-text',
        'html'
      )}${checkValue(button.successText, 'success-text', 'html')}${checkValue(
        button.amount,
        'amount',
        'html'
      )}${checkCurrency(button.currency, 'html')}${checkAnimation(
        button.animation,
        'html'
      )}${checkTheme(button.theme, 'html')}
/>`,
      javascript: `<script src="https://unpkg.com/@paybutton/paybutton/dist/paybutton.js"></script>

<div id="my_button"></div>
      
<script>      
  var config = {
    to: '${button.to}',${checkValue(button.text, 'text', 'js')}${checkValue(
        button.hoverText,
        'hoverText',
        'js'
      )}${checkValue(button.successText, 'successText', 'js')}${checkValue(
        button.amount,
        'amount',
        'js'
      )}
    currency: '${button.currency}',${checkAnimation(button.animation, 'js')}
    ${checkTheme(button.theme, 'js')}
  };

  PayButton.render(document.getElementById('my_button'), config);
</script>`,
      react: `import { PayButton } from '@paybutton/react'

function App() {
  const to = '${button.to}'${checkValue(
        button.text,
        'text',
        'react'
      )}${checkValue(button.hoverText, 'hoverText', 'react')}${checkValue(
        button.successText,
        'successText',
        'react'
      )}${checkValue(button.amount, 'amount', 'react')}
  const currency = '${button.currency}'${checkAnimation(
        button.animation,
        'react'
      )}${checkTheme(button.theme, 'react')}

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

  useEffect(() => {
    Prism.highlightAll();
  }, [code, codeType]);

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
        {codeType === 'HTML' ? (
          <code className="language-html">{code.html}</code>
        ) : codeType === 'JavaScript' ? (
          <code className="language-js">{code.javascript}</code>
        ) : (
          <code className="language-jsx">{code.react}</code>
        )}
      </pre>
    </>
  );
}
