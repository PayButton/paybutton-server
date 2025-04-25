import { useEffect, useState } from 'react'
import Image from 'next/image'
import style from './button-generator.module.css'
import CopyIcon from '/assets/copy.png'
import Prism from 'prismjs'
import 'prismjs/themes/prism-okaidia.css'
import 'prismjs/components/prism-jsx.min'
import { initialButtonState } from './index'

export default function CodeBlock ({ button }): JSX.Element {
  const [isCopied, setIsCopied] = useState(false)
  const [codeType, setCodeType] = useState('HTML')
  const [code, setCode] = useState({
    html: '',
    javascript: '',
    react: ''
  })

  const codetypes = ['HTML', 'JavaScript', 'React']

  const handleCopyClick = async (): Promise<void> => {
    const codeToCopy =
      codeType === 'HTML'
        ? code.html
        : codeType === 'JavaScript'
          ? code.javascript
          : code.react

    try {
      await navigator.clipboard.writeText(codeToCopy)
      setIsCopied(true)
      setTimeout(() => {
        setIsCopied(false)
      }, 1000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  function camelToKebabCase (key: string): string {
    return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
  }

  function makeCodeString (key: string, value: any, codeType: string): string {
    if (codeType === 'html') {
      if (key === 'amount' || key === 'goalAmount' || typeof value === 'boolean') {
        if (key === 'randomSatoshis' && button.amount <= 0) {
          return ''
        } else return camelToKebabCase(key) + `=${value as string}`
      } else if (typeof value === 'string') {
        return camelToKebabCase(key) + `="${value}"`
      } else if (typeof value === 'object') {
        return camelToKebabCase(key) + `='${JSON.stringify(value)}'`
      } else {
        return camelToKebabCase(key) + `="${value as string}"`
      }
    } else if (codeType === 'js') {
      if (key === 'amount' ||
      key === 'goalAmount' ||
      key === 'onSuccess' ||
      key === 'onTransaction' ||
      key === 'onClose' ||
      key === 'onOpen' ||
       typeof value === 'boolean') {
        if (key === 'randomSatoshis' && button.amount <= 0) {
          return ''
        } else return `  ${key}: ${value as string}`
      } else if (typeof value === 'string') {
        return `  ${key}: '${value}'`
      } else if (typeof value === 'object') {
        return `  ${key}: ${JSON.stringify(value)}`
      } else {
        return `  ${key}: '${value as string}'`
      }
    } else {
      if (key === 'amount' ||
          key === 'goalAmount' ||
          key === 'onSuccess' ||
          key === 'onTransaction' ||
          key === 'onClose' ||
          key === 'onOpen' ||
          typeof value === 'boolean') {
        if (key === 'randomSatoshis' && button.amount <= 0) {
          return ''
        } else return `const ${key} = ${value as string}`
      } else if (typeof value === 'string') {
        return `const ${key} = '${value}'`
      } else if (typeof value === 'object') {
        return `const ${key} = ${JSON.stringify(value)}`
      } else {
        return `const ${key} = '${value as string}'`
      }
    }
  }

  const propertiesToSkip = ['to', 'currencies', 'validAddress', 'bchtheme', 'widget']
  const currenciesToSkip = ['XEC', 'BCH']
  const generateReactProps = (button: any): string => {
    let result = ''
    for (const [key, value] of Object.entries(button)) {
      if (propertiesToSkip.includes(key) || 
        JSON.stringify(initialButtonState[key]) === JSON.stringify(value) || 
        JSON.stringify(initialButtonState.bchtheme) === JSON.stringify(value) ||
        (key === 'randomSatoshis' && button.amount <= 0) ||
        currenciesToSkip.includes(value as string)) {
        continue
      } else result += `    ${key}={${key}}\n`
    }
    return result
  }

  const generateCode = (button: any, codeType: string): string => {
    let result = ''
    for (const [key, value] of Object.entries(button)) {
      if (propertiesToSkip.includes(key) || 
        JSON.stringify(initialButtonState[key]) === JSON.stringify(value) || 
        JSON.stringify(initialButtonState.bchtheme) === JSON.stringify(value) || 
        currenciesToSkip.includes(value as string)) {
        continue
      } else result += `  ${makeCodeString(key, value, codeType)}\n`
    }
    return result
  }

  useEffect(() => {
    setCode({
      html: `<script src="https://unpkg.com/@paybutton/paybutton/dist/paybutton.js"></script>

<div
  class="paybutton${button.widget === true ? '-widget' : ''}"
  to="${button.to as string}"
${generateCode(button, 'html')}></div>`,
      javascript: `<script src="https://unpkg.com/@paybutton/paybutton/dist/paybutton.js"></script>

<div id="my_button"></div>
      
<script>      
  var config = {
    to: '${button.to as string}',
${generateCode(button, 'js')}};

  PayButton.render${button.widget === true ? 'Widget' : ''}(document.getElementById('my_button'), config);
</script>`,
      react: `import { ${button.widget === true ? 'PayButtonWidget' : 'PayButton'} } from '@paybutton/react'

function App() {
  const to = '${button.to as string}'
${generateCode(button, 'react')}

  return <PayButton${button.widget === true ? 'Widget' : ''}
    to={to}
${generateReactProps(button)}  />
}`
    })
  }, [button])

  useEffect(() => {
    Prism.highlightAll()
  }, [code, codeType])

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
        <div className={style.copybutton} onClick={() => { void handleCopyClick() }}>
          <Image src={CopyIcon} alt="copy" />
          {isCopied ? 'Copied!' : 'Copy'}
        </div>
      </div>
      <pre className={style.code_ctn}>
        {codeType === 'HTML'
          ? (
          <code className="language-html">{code.html}</code>
            )
          : codeType === 'JavaScript'
            ? (
          <code className="language-js">{code.javascript}</code>
              )
            : (
          <code className="language-jsx">{code.react}</code>
              )}
      </pre>
    </>
  );
}
