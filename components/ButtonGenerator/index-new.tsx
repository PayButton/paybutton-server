import { useState } from 'react'
import s from './button-generator.module.css'
import style from '/styles/landing.module.css'
import { PayButton } from '@paybutton/react'
import { ChromePicker } from 'react-color'
import CodeBlock from './CodeBlock'
import { decode } from 'ecashaddrjs'
import { generatorFieldsCol1, generatorFieldsCol2 } from './data.js'
import {
  PRIMARY_XEC_COLOR,
  SECONDARY_XEC_COLOR,
  TERTIARY_XEC_COLOR,
  PRIMARY_BCH_COLOR,
  SECONDARY_BCH_COLOR,
  TERTIARY_BCH_COLOR
} from '/constants'

export default function ButtonGenerator (): JSX.Element {
  interface ButtonState {
    to: string
    currency: string
    text: string
    hoverText: string
    successText: string
    animation: string
    theme: object
    validAddress: string
    currencies: any[]
    goalAmount: string
    onSuccess: string
    onTransaction: string
    randomSatoshis: boolean
    hideToasts: boolean
    disableEnforceFocus: boolean
    disabled: boolean
    editable: boolean
    widget: boolean
    [key: string]: any
  }

  const initialButtonState = {
    to: '',
    currency: 'XEC',
    text: '',
    hoverText: '',
    successText: '',
    animation: 'slide',
    theme: {
      palette: {
        primary: PRIMARY_XEC_COLOR,
        secondary: SECONDARY_XEC_COLOR,
        tertiary: TERTIARY_XEC_COLOR
      }
    },
    validAddress: '',
    currencies: ['XEC', 'USD', 'CAD'],
    goalAmount: '',
    onSuccess: '',
    onTransaction: '',
    randomSatoshis: true,
    hideToasts: false,
    disableEnforceFocus: false,
    disabled: false,
    editable: false,
    widget: false
  }

  const [button, setButton] = useState<ButtonState>(initialButtonState)

  const isValidAddress = (address: string): string => {
    try {
      return decode(address).prefix
    } catch (err) {
      return 'not valid'
    }
  }

  const handleInputChange = (e: any): any => {
    const { name, value } = e.target
    if (['primary', 'secondary', 'tertiary'].includes(name)) {
      setButton((prevButton) => ({
        ...prevButton,
        theme: {
          ...prevButton.theme,
          palette: {
            ...prevButton.theme.palette,
            [name]: value
          }
        }
      }))
    } else if (name === 'to') {
      setButton((prevButton) => ({
        ...prevButton,
        [name]: value,
        validAddress: isValidAddress(value),
        currency: ['USD', 'CAD', 'EUR', 'GBP', 'AUD'].includes(
          prevButton.currency
        )
          ? prevButton.currency
          : isValidAddress(value) === 'bitcoincash'
            ? 'BCH'
            : 'XEC',
        currencies: [
          isValidAddress(value) === 'bitcoincash' ? 'BCH' : 'XEC',
          ...prevButton.currencies.slice(1) // Keep the rest of the array unchanged
        ],
        theme: {
          ...prevButton.theme, // Keep the existing theme values
          palette: {
            ...prevButton.theme.palette, // Keep the existing palette values
            primary:
              prevButton.theme.palette.primary !== PRIMARY_XEC_COLOR &&
              prevButton.theme.palette.primary !== PRIMARY_BCH_COLOR
                ? prevButton.theme.palette.primary
                : isValidAddress(value) === 'bitcoincash'
                  ? PRIMARY_BCH_COLOR
                  : PRIMARY_XEC_COLOR
          }
        }
      }))
    } else if (name === 'amount' || name === 'goalAmount') {
      // Remove non-numeric characters except for a single decimal point
      let numericValue = e.target.value.replace(/[^\d.]/g, '')
      // Ensure there's only one decimal point
      const parts = numericValue.split('.')
      if (parts.length > 2) {
        // More than one decimal point, keep only the first part before the second decimal point
        numericValue = `${parts[0]}.${parts[1]}`
      }
      setButton((prevButton) => ({
        ...prevButton,
        [name]: numericValue
      }))
    } else {
      setButton((prevButton) => ({
        ...prevButton,
        [name]: value
      }))
    }
  }

  return (
    <div className={s.bg_ctn} id="button-generator">
      <div className={style.container}>
        <h2 className={style.heading2}>Button Generator</h2>
        <p className={style.centerp}>
          Build your custom PayButton and begin accepting payments on your
          website today!
        </p>
        <div className={s.bg_top_ctn}>
          <div className={s.form_ctn}>
            <form action="#" method="post">
              <div className={s.form_half}>
                {generatorFieldsCol1.map((field, index) => (
                    <div className={s[field.className]} key={index}>
                      <label>{field.name}</label>
                      <input
                        name={field.key}
                        value={button[field.key]}
                        placeholder={field.placeholder}
                        onChange={handleInputChange}
                      />
                    </div>
                ))}
              </div>

              <div className={s.form_half}>
                {generatorFieldsCol2.map((field, index) => (
                      <div className={s[field.className]} key={index}>
                        <label>{field.name}</label>
                        <input
                          name={field.key}
                          value={button[field.key]}
                          placeholder={field.placeholder}
                          onChange={handleInputChange}
                        />
                    </div>
                ))}
              </div>
            </form>
          </div>
          <div className={s.preview_ctn}>
            <div className={s.preview_label}>Preview</div>
            {button.validAddress === 'ecash' ||
            button.validAddress === 'bitcoincash'
              ? (
              <PayButton
                to={button.to}
                amount={button.amount}
                currency={button.currency}
                text={button.text === '' ? undefined : button.text}
                hoverText={
                  button.hoverText === '' ? undefined : button.hoverText
                }
                successText={
                  button.successText === '' ? undefined : button.successText
                }
                theme={button.theme}
                animation={button.animation}
              />
                )
              : button.validAddress === 'not valid' &&
              button.to.length !== 0
                ? (
              <span style={{ color: 'red' }}>Enter a valid address</span>
                  )
                : (
                    'Enter an address'
                  )}
          </div>
        </div>
        <CodeBlock button={button} />
      </div>
    </div>
  )
}
