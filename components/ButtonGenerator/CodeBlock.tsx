import { useEffect, useState } from 'react';
import Image from 'next/image';
import style from './button-generator.module.css';
import CopyIcon from '/assets/copy.png';
import Prism from 'prismjs';
import 'prismjs/themes/prism-okaidia.css';
import 'prismjs/components/prism-jsx.min';
import {
  PRIMARY_XEC_COLOR,
  SECONDARY_XEC_COLOR,
  TERTIARY_XEC_COLOR,
  PRIMARY_BCH_COLOR,
  SECONDARY_BCH_COLOR,
  TERTIARY_BCH_COLOR,
} from '/constants';

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
        if (attribute === 'amount' || attribute === 'goal-amount') {
          return `\n  ${attribute}=${value}`;
        } else return `\n  ${attribute}="${value}"`;
      } else return '';
    } else if (type === 'js') {
      if (value !== undefined && value !== '') {
        if (
          attribute === 'amount' ||
          attribute === 'goalAmount' ||
          attribute === 'onSuccess' ||
          attribute === 'onTransaction'
        ) {
          return `\n    ${attribute}: ${value},`;
        } else return `\n    ${attribute}: "${value}",`;
      } else return '';
    } else {
      if (value !== undefined && value !== '') {
        if (
          attribute === 'amount' ||
          attribute === 'goalAmount' ||
          attribute === 'onSuccess' ||
          attribute === 'onTransaction'
        ) {
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

  const filterDefaultCurrency = (value, type) => {
    if (['XEC', 'BCH'].includes(value)) {
      return '';
    } else if (type === 'html') {
      return `\n  currency="${value}"`;
    } else if (type === 'js') {
      return `\n    currency: "${value}",`;
    } else {
      return `\n  const currency = '${value}'`;
    }
  };

  const checkTheme = (value, type) => {
    if (
      (value.palette.primary === PRIMARY_XEC_COLOR &&
        value.palette.secondary === SECONDARY_XEC_COLOR &&
        value.palette.tertiary === TERTIARY_XEC_COLOR) ||
      (value.palette.primary === PRIMARY_BCH_COLOR &&
        value.palette.secondary === SECONDARY_BCH_COLOR &&
        value.palette.tertiary === TERTIARY_BCH_COLOR)
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

  const checkReactValue = (value, attribute) => {
    if (value !== undefined && value !== '') {
      if (attribute === 'currency') {
        if (['USD', 'CAD', 'EUR', 'GBP', 'AUD'].includes(value)) {
          return `\n    ${attribute}={${attribute}}`;
        } else return '';
      } else return `\n    ${attribute}={${attribute}}`;
    } else return '';
  };

  const checkReactAnimation = (value) => {
    if (value === 'slide') {
      return '';
    } else {
      return '\n    animation={animaiton}';
    }
  };

  const checkReactTheme = (value) => {
    if (
      (value.palette.primary === PRIMARY_XEC_COLOR &&
        value.palette.secondary === SECONDARY_XEC_COLOR &&
        value.palette.tertiary === TERTIARY_XEC_COLOR) ||
      (value.palette.primary === PRIMARY_BCH_COLOR &&
        value.palette.secondary === SECONDARY_BCH_COLOR &&
        value.palette.tertiary === TERTIARY_BCH_COLOR)
    ) {
      return '';
    } else {
      return '\n    theme={theme}';
    }
  };

  const checkBoolean = (attribute, value, defaultValue, type) => {
    if (value === defaultValue) {
      return '';
    } else {
      if (type === 'html') {
        return `\n  ${attribute}="${value}"`;
      }
      if (type === 'js') {
        return `\n    ${attribute}: ${value}`;
      }
      if (type === 'react') {
        return `\n  const ${attribute} = ${value}`;
      }
    }
  };

  const checkReactBooleanValue = (value, attribute, defaultValue) => {
    if (value === defaultValue) {
      return '';
    } else return `\n    ${attribute}={${attribute}}`;
  };

  useEffect(() => {
    setCode({
      html: `<script src="https://unpkg.com/@paybutton/paybutton/dist/paybutton.js"></script>

<div
  class="paybutton${button.widget === true ? '-widget' : ''}"
  to="${button.to}"${checkValue(button.text, 'text', 'html')}${checkValue(
        button.hoverText,
        'hover-text',
        'html'
      )}${checkValue(button.successText, 'success-text', 'html')}${checkValue(
        button.amount,
        'amount',
        'html'
      )}${filterDefaultCurrency(button.currency, 'html')}${checkAnimation(
        button.animation,
        'html'
      )}${checkValue(button.onSuccess, 'on-success', 'html')}${checkValue(
        button.onTransaction,
        'on-transaction',
        'html'
      )}${checkValue(button.wsBaseUrl, 'ws-base-url', 'html')}${checkValue(
        button.apiBaseUrl,
        'api-base-url',
        'html'
      )}${checkTheme(button.theme, 'html')}${checkValue(
        button.goalAmount,
        'goal-amount',
        'html'
      )}${checkBoolean(
        'random-satoshis',
        button.randomSatoshis,
        true,
        'html'
      )}${checkBoolean(
        'hide-toasts',
        button.hideToasts,
        false,
        'html'
      )}${checkBoolean(
        'disable-enforce-focus',
        button.disableEnforceFocus,
        false,
        'html'
      )}${checkBoolean(
        'disabled',
        button.disabled,
        false,
        'html'
      )}${checkBoolean('editable', button.editable, false, 'html')}
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
      )}${filterDefaultCurrency(button.currency, 'js')}${checkAnimation(
        button.animation,
        'js'
      )}${checkValue(button.onSuccess, 'onSuccess', 'js')}${checkValue(
        button.onTransaction,
        'onTransaction',
        'js'
      )}${checkValue(button.wsBaseUrl, 'wsBaseUrl', 'js')}${checkValue(
        button.apiBaseUrl,
        'apiBaseUrl',
        'js'
      )}${checkTheme(button.theme, 'js')}${checkValue(
        button.goalAmount,
        'goalAmount',
        'js'
      )}${checkBoolean(
        'randomSatoshis',
        button.randomSatoshis,
        true,
        'js'
      )}${checkBoolean(
        'hideToasts',
        button.hideToasts,
        false,
        'js'
      )}${checkBoolean(
        'disableEnforceFocus',
        button.disableEnforceFocus,
        false,
        'js'
      )}${checkBoolean('disabled', button.disabled, false, 'js')}${checkBoolean(
        'editable',
        button.editable,
        false,
        'js'
      )}
  };

  PayButton.render${
    button.widget === true ? 'Widget' : ''
  }(document.getElementById('my_button'), config);
</script>`,
      react: `import { ${button.widget === true ? 'Widget as ' : ''}PayButton${
        button.widget === true ? 'Widget' : ''
      } } from '@paybutton/react'

function App() {
  const to = '${button.to}'${checkValue(
        button.text,
        'text',
        'react'
      )}${checkValue(button.hoverText, 'hoverText', 'react')}${checkValue(
        button.successText,
        'successText',
        'react'
      )}${checkValue(button.amount, 'amount', 'react')}${filterDefaultCurrency(
        button.currency,
        'react'
      )}${checkAnimation(button.animation, 'react')}${checkValue(
        button.onSuccess,
        'onSuccess',
        'react'
      )}${checkValue(
        button.onTransaction,
        'onTransaction',
        'react'
      )}${checkValue(button.wsBaseUrl, 'wsBaseUrl', 'react')}${checkValue(
        button.apiBaseUrl,
        'apiBaseUrl',
        'react'
      )}${checkTheme(button.theme, 'react')}${checkValue(
        button.goalAmount,
        'goalAmount',
        'react'
      )}${checkBoolean(
        'randomSatoshis',
        button.randomSatoshis,
        true,
        'react'
      )}${checkBoolean(
        'hideToasts',
        button.hideToasts,
        false,
        'react'
      )}${checkBoolean(
        'disableEnforceFocus',
        button.disableEnforceFocus,
        false,
        'react'
      )}${checkBoolean(
        'disabled',
        button.disabled,
        false,
        'react'
      )}${checkBoolean('editable', button.editable, false, 'react')}

  return <PayButton${button.widget === true ? 'Widget' : ''}
    to={to}${checkReactValue(button.text, 'text')}${checkReactValue(
        button.hoverText,
        'hoverText'
      )}${checkReactValue(button.successText, 'successText')}${checkReactValue(
        button.amount,
        'amount'
      )}${checkReactValue(button.currency, 'currency')}${checkReactAnimation(
        button.animation
      )}${checkReactValue(button.goalAmount, 'goalAmount')}${checkReactValue(
        button.onSuccess,
        'onSuccess'
      )}${checkReactValue(
        button.onTransaction,
        'onTransaction'
      )}${checkReactValue(button.wsBaseUrl, 'wsBaseUrl')}${checkReactValue(
        button.apiBaseUrl,
        'apiBaseUrl'
      )}${checkReactTheme(button.theme)}${checkReactBooleanValue(
        button.randomSatoshis,
        'randomSatoshis',
        true
      )}${checkReactBooleanValue(
        button.hideToasts,
        'hideToasts',
        false
      )}${checkReactBooleanValue(
        button.disableEnforceFocus,
        'disableEnforceFocus',
        false
      )}${checkReactBooleanValue(
        button.disabled,
        'disabled',
        false
      )}${checkReactBooleanValue(button.editable, 'editable', false)}
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
