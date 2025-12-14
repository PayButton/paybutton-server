import { useState } from 'react'
import s from './button-generator.module.css'
import style from '../../styles/landing.module.css'
import { PayButton, Widget as PayButtonWidget } from '@paybutton/react'
import { ChromePicker } from 'react-color'
import CodeBlock from './CodeBlock'
import { decodeCashAddress } from 'ecashaddrjs'
import { generatorFormFields } from './data.js'
import {
  PRIMARY_XEC_COLOR,
  SECONDARY_XEC_COLOR,
  TERTIARY_XEC_COLOR,
  PRIMARY_BCH_COLOR,
  SECONDARY_BCH_COLOR,
  TERTIARY_BCH_COLOR
} from '../../constants'

interface ButtonState {
  to: string
  amount: string
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
  disablePaymentId: boolean
  contributionOffset: number
  disableAltpayment: boolean
  opReturn: string
  [key: string]: any
}

export const initialButtonState: ButtonState = {
  to: '',
  amount: '',
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
  bchtheme: {
    palette: {
      primary: PRIMARY_BCH_COLOR,
      secondary: SECONDARY_BCH_COLOR,
      tertiary: TERTIARY_BCH_COLOR
    }
  },
  validAddress: '',
  currencies: ['XEC', 'USD', 'CAD'],
  goalAmount: '',
  onSuccess: '',
  onTransaction: '',
  randomSatoshis: true,
  hideToasts: false,
  disableEnforceFocus: true,
  disabled: false,
  editable: false,
  widget: false,
  disablePaymentId: false,
  opReturn: '',
  contributionOffset: 0,
  disableAltpayment: false,
  autoClose: true,
  onOpen: '',
  onClose: '',
  wsBaseURL: '',
  apiBaseURL: ''
}

export default function ButtonGenerator (): JSX.Element {
  const [button, setButton] = useState<ButtonState>(initialButtonState)
  const [colorPicker, setColorPicker] = useState('')
  const [advanced, setAdvanced] = useState(false)

  const isValidAddress = (address: string): string => {
    try {
      return decodeCashAddress(address).prefix
    } catch (err) {
      return 'not valid'
    }
  }

  const handleChange = (e: any): any => {
    const { name, value } = e.target
    setButton((prevButton) => ({
      ...prevButton,
      [name]: value
    }))
  }

  const handleCheckBoxChange = (e: any): any => {
    const { name, checked } = e.target
    setButton((prevButton) => ({
      ...prevButton,
      [name]: checked
    }))
  }

  const handleColorChange = (e: any): any => {
    const { name, value } = e.target
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
  }

  const handleSwatchColorChange = (newColor, colorName: string): void => {
    setButton((prevButton) => ({
      ...prevButton,
      theme: {
        ...prevButton.theme,
        palette: {
          ...prevButton.theme.palette,
          [colorName]: newColor.hex
        }
      }
    }))
  }

  const handleAmountChange = (e: any): any => {
    const { name } = e.target
    // Remove non-numeric characters except for a single decimal point
    let numericValue = e.target.value.replace(/[^\d.]/g, '')
    // Ensure there's only one decimal point
    const parts = numericValue.split('.')
    if (parts.length > 2) {
      // More than one decimal point, keep only the first part before the second decimal point
      numericValue = `${parts[0] as string}.${parts[1] as string}`
    }
    setButton((prevButton) => ({
      ...prevButton,
      [name]: numericValue
    }))
  }

  const handleAddressChange = (e: any): any => {
    const { name, value } = e.target
    setButton((prevButton) => ({
      ...prevButton,
      [name]: value,
      validAddress: isValidAddress(value),
      currency: (!['XEC', 'BCH'].includes(
        prevButton.currency
      ))
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
  }

  interface FunctionMap {
    [key: string]: (e: any) => any
  }

  const functionMap: FunctionMap = {
    handleChange,
    handleColorChange,
    handleAmountChange,
    handleAddressChange
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
        <div className={s.form_preview_ctn}>
          <div className={s.form_ctn}>
            <form action="#" method="post">
               {generatorFormFields.map((field, index) => {
                 let fieldComponent
                 switch (field.type) {
                   case 'select':
                     fieldComponent = (
                        <select
                          name={field.key}
                          value={button[field.key]}
                          onChange={functionMap[field.onChange]}
                        >
                          {field.key === 'currency'
                            ? button.currencies.map((option, i) => (
                            <option value={option} key={i}>
                              {option}
                            </option>
                            ))
                            : field.options.map((option, i) => (
                            <option value={option} key={i}>
                              {option}
                            </option>
                            ))}
                        </select>
                     )
                     break
                   case 'input':
                     fieldComponent = (
                        <input
                          name={field.key}
                          value={button[field.key]}
                          placeholder={field.placeholder}
                          onChange={functionMap[field.onChange]}
                          maxLength={field.key === 'amount' ? 13 : 200}
                        />
                     )
                     break
                   case 'color':
                     fieldComponent = (
                       <div className={s.swatch_input_ctn}>
                       {colorPicker === field.key && (
                         <>
                           <div
                             className={s.picker_outerctn}
                             onClick={() => setColorPicker('')}
                           />
                           <div className={s.picker_ctn}>
                             <ChromePicker
                               color={button.theme.palette[field.key]}
                               onChange={(color) =>
                                 handleSwatchColorChange(color, field.key)
                               }
                             />
                           </div>
                         </>
                       )}
                       <div className={s.colorinput}>
                         <div
                           className={s.swatch}
                           style={{
                             background: `${button.theme.palette[field.key] as string}`
                           }}
                           onClick={() => setColorPicker(field.key)}
                         />
                       </div>
                     </div>
                     )
                     break
                   case 'boolean':
                     fieldComponent = (
                          <label className={s.switch}>
                          <input
                            type="checkbox"
                            checked={button[field.key]}
                            onChange={handleCheckBoxChange}
                            name={field.key}
                          />
                          <span className={s.slider}></span>
                        </label>
                     )
                     break
                   default:
                     fieldComponent = null // Handle unsupported field types as needed
                 }
                 return (
                    <div className={`${s[field.className]} ${field.advanced === true && !advanced ? s.advanced : ''}`} key={index}>
                      {field.key !== 'randomSatoshis'
                        ? <>
                      <label>
                        <div className={s.label_ctn}>
                          {field.name}
                          {field.helpText !== undefined &&
                            <div className={s.help_tip}>
                              <p>{field.helpText}</p>
                            </div>
                          }
                          {field.key === 'to' && (
                            <a
                              href="https://cashtab.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className={s.get_address_link}>
                                Get an address
                            </a>
                          )
                        }
                        </div>
                      </label>
                      {fieldComponent}
                      </>
                        : parseFloat(button.amount) > 0
                          ? <>
                      <label>
                        <div className={s.label_ctn}>
                          {field.name}
                          {field.helpText !== undefined &&
                            <div className={s.help_tip}>
                              <p>{field.helpText}</p>
                            </div>
                          }
                        </div>
                      </label>
                      {fieldComponent}
                      </>
                          : null}
                    </div>
                 )
               })}
            </form>
            <div className={s.advanced_ctn}>
              <div onClick={() => setAdvanced(!advanced)}>{advanced && 'Hide '}Advanced</div>
              <a
                href="https://docs.paybutton.org/#/?id=what-is-paybutton"
                target="_blank"
                rel="noopener noreferrer"
              >
                Documentation
              </a>
              <div onClick={() => setButton(initialButtonState)}>Reset</div>
            </div>
          </div>
          <div className={s.preview_ctn}>
            <div className={s.preview_label}>Preview</div>
            {button.validAddress === 'ecash' ||
            button.validAddress === 'bitcoincash'
              ? (
                  button.widget
                    ? (
                <PayButtonWidget
                  key={`widget-${JSON.stringify(button)}`}
                  to={button.to}
                  amount={button.amount === '' ? undefined : parseFloat(button.amount)}
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
                  goalAmount={
                    button.goalAmount === '' ? undefined : button.goalAmount
                  }
                  onSuccess={
                    button.onSuccess === '' ? undefined : button.onSuccess
                  }
                  onTransaction={
                    button.onTransaction === ''
                      ? undefined
                      : button.onTransaction
                  }
                  randomSatoshis={button.amount !== '' ? button.randomSatoshis : undefined}
                  hideToasts={button.hideToasts}
                  disableEnforceFocus={button.disableEnforceFocus}
                  contributionOffset={button.contributionOffset}
                  disableAltpayment={button.disableAltpayment}
                  disabled={button.disabled}
                  editable={button.editable}
                />
                      )
                    : (
                <PayButton
                  key={`button-${JSON.stringify(button)}`}
                  to={button.to}
                  amount={button.amount === '' ? undefined : button.amount}
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
                  goalAmount={
                    button.goalAmount === '' ? undefined : button.goalAmount
                  }
                  onSuccess={
                    button.onSuccess === '' ? undefined : button.onSuccess
                  }
                  onTransaction={
                    button.onTransaction === ''
                      ? undefined
                      : button.onTransaction
                  }
                  randomSatoshis={button.amount !== '' ? button.randomSatoshis : undefined}
                  hideToasts={button.hideToasts}
                  disableEnforceFocus={button.disableEnforceFocus}
                  contributionOffset={button.contributionOffset}
                  disableAltpayment={button.disableAltpayment}
                  disabled={button.disabled}
                  editable={button.editable}
                  autoClose={button.autoClose}
                  onOpen={button.onOpen === '' ? undefined : button.onOpen}
                  onClose={button.onClose === '' ? undefined : button.onClose}
                  wsBaseURL={button.wsBaseURL}
                  apiBaseURL={button.apiBaseURL}
                />
                      )
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
        </div>
        <CodeBlock button={button} />
      </div>
    </div>
  )
}
