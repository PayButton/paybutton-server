import { useState } from 'react';
import s from './button-generator.module.css';
import style from '/styles/landing.module.css';
import { PayButton, Widget as PayButtonWidget } from '@paybutton/react';
import { ChromePicker } from 'react-color';
import CodeBlock from './CodeBlock';
import { decode } from 'ecashaddrjs';
import {
  PRIMARY_XEC_COLOR,
  SECONDARY_XEC_COLOR,
  TERTIARY_XEC_COLOR,
  PRIMARY_BCH_COLOR,
  SECONDARY_BCH_COLOR,
  TERTIARY_BCH_COLOR,
} from '/constants';

export const isValidAddress = (address: string): string => {
  try {
    return decode(address).prefix;
  } catch (err) {
    return 'not valid';
  }
};

export default function ButtonGenerator(): JSX.Element {
  const animations = ['slide', 'invert', 'none'];
  const [primary, setPrimary] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [secondary, setSecondary] = useState(false);
  const [tertiary, setTertiary] = useState(false);

  const initalState = {
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
        tertiary: TERTIARY_XEC_COLOR,
      },
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
    widget: false,
  };

  const [button, setButton] = useState(initalState);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (['primary', 'secondary', 'tertiary'].includes(name)) {
      setButton((prevButton) => ({
        ...prevButton,
        theme: {
          ...prevButton.theme,
          palette: {
            ...prevButton.theme.palette,
            [name]: value,
          },
        },
      }));
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
          ...prevButton.currencies.slice(1), // Keep the rest of the array unchanged
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
                : PRIMARY_XEC_COLOR,
          },
        },
      }));
    } else if (name === 'amount' || name === 'goalAmount') {
      // Remove non-numeric characters except for a single decimal point
      let numericValue = e.target.value.replace(/[^\d.]/g, '');
      // Ensure there's only one decimal point
      const parts = numericValue.split('.');
      if (parts.length > 2) {
        // More than one decimal point, keep only the first part before the second decimal point
        numericValue = `${parts[0]}.${parts[1]}`;
      }
      setButton((prevButton) => ({
        ...prevButton,
        [name]: numericValue,
      }));
    } else {
      setButton((prevButton) => ({
        ...prevButton,
        [name]: value,
      }));
    }
  };

  const handleCheckBoxChange = (e) => {
    const { name, checked } = e.target;
    setButton((prevButton) => ({
      ...prevButton,
      [name]: checked,
    }));
  };

  const handleColorChange = (newColor, colorName: string): void => {
    setButton((prevButton) => ({
      ...prevButton,
      theme: {
        ...prevButton.theme,
        palette: {
          ...prevButton.theme.palette,
          [colorName]: newColor.hex,
        },
      },
    }));
  };

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
                <label className={s.address_label}>
                  <div>
                    To<span>*</span>
                  </div>
                  <a
                    href="https://cashtab.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get an address
                  </a>
                </label>
                <input
                  type="text"
                  name="to"
                  placeholder="Your address"
                  value={button.to}
                  onChange={handleInputChange}
                />

                <label>Text</label>
                <input
                  type="text"
                  name="text"
                  value={button.text}
                  placeholder="Donate"
                  onChange={handleInputChange}
                />

                <label>Hover Text</label>
                <input
                  type="text"
                  name="hoverText"
                  value={button.hoverText}
                  placeholder="Send Payment"
                  onChange={handleInputChange}
                />

                <label>Success Text</label>
                <input
                  type="text"
                  name="successText"
                  value={button.successText}
                  placeholder="Thanks for your support!"
                  onChange={handleInputChange}
                />
                {advanced && (
                  <>
                    <div className={s.form_row}>
                      <div className={s.form_row_input_ctn}>
                        <label>On Success</label>
                        <input
                          type="text"
                          name="onSuccess"
                          value={button.onSuccess}
                          placeholder="callback function"
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className={s.form_row_input_ctn}>
                        <label>On Transaction</label>
                        <input
                          type="text"
                          name="onTransaction"
                          value={button.onTransaction}
                          placeholder="callback function"
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    <div className={s.form_row}>
                      <div className={s.form_row_input_ctn}>
                        <label>WS Base Url</label>
                        <input
                          type="text"
                          name="wsBaseUrl"
                          value={button.wsBaseUrl}
                          placeholder="https://socket.paybutton.org"
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className={s.form_row_input_ctn}>
                        <label>API Base Url</label>
                        <input
                          type="text"
                          name="apiBaseUrl"
                          value={button.apiBaseUrl}
                          placeholder="https://paybutton.org"
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </>
                )}
                <div className={s.advanced_ctn}>
                  <div onClick={() => setAdvanced(!advanced)}>
                    {advanced && 'Hide '}Advanced
                  </div>
                  <div onClick={() => setButton(initalState)}>Reset</div>
                  <a
                    href="https://docs.paybutton.org/#/?id=what-is-paybutton"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Documentation
                  </a>
                </div>
              </div>

              <div className={s.form_half}>
                <div className={s.input_ctn}>
                  <div className={s.amount_ctn}>
                    <label>Amount</label>
                    <input
                      type="text"
                      name="amount"
                      value={button.amount}
                      placeholder="0"
                      onChange={handleInputChange}
                      maxLength={13}
                    />
                  </div>
                  <div>
                    <label>Currency</label>
                    <select
                      name="currency"
                      value={button.currency}
                      placeholder=""
                      onChange={handleInputChange}
                    >
                      {button.currencies.map((currency, index) => (
                        <option value={currency} key={index}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label>Animation</label>
                <select
                  name="animation"
                  value={button.animation}
                  onChange={handleInputChange}
                >
                  {animations.map((currency, index) => (
                    <option value={currency} key={index}>
                      {currency}
                    </option>
                  ))}
                </select>
                <div className={s.form_row}>
                  <div className={s.form_row_input_ctn}>
                    <label>Primary</label>
                    <div className={s.swatch_input_ctn}>
                      {primary && (
                        <>
                          <div
                            className={s.picker_outerctn}
                            onClick={() => setPrimary(false)}
                          />
                          <div className={s.picker_ctn}>
                            <ChromePicker
                              color={button.theme.palette.primary}
                              onChange={(color) =>
                                handleColorChange(color, 'primary')
                              }
                            />
                          </div>
                        </>
                      )}
                      <div className={s.colorinput}>
                        <div
                          className={s.swatch}
                          style={{
                            background: `${button.theme.palette.primary}`,
                          }}
                          onClick={() => setPrimary(!primary)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className={s.form_row_input_ctn}>
                    <label>Secondary</label>
                    <div className={s.swatch_input_ctn}>
                      {secondary && (
                        <>
                          <div
                            className={s.picker_outerctn}
                            onClick={() => setSecondary(false)}
                          />
                          <div className={s.picker_ctn}>
                            <ChromePicker
                              color={button.theme.palette.secondary}
                              onChange={(color) =>
                                handleColorChange(color, 'secondary')
                              }
                            />
                          </div>
                        </>
                      )}
                      <div className={s.colorinput}>
                        <div
                          className={s.swatch}
                          style={{
                            background: `${button.theme.palette.secondary}`,
                          }}
                          onClick={() => setSecondary(!secondary)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className={s.secondary_color_ctn}>
                  <div>
                    <label>Tertiary</label>
                    <div className={s.swatch_input_ctn}>
                      {tertiary && (
                        <>
                          <div
                            className={s.picker_outerctn}
                            onClick={() => setTertiary(false)}
                          />
                          <div className={s.picker_ctn}>
                            <ChromePicker
                              color={button.theme.palette.tertiary}
                              onChange={(color) =>
                                handleColorChange(color, 'tertiary')
                              }
                            />
                          </div>
                        </>
                      )}
                      <div className={s.colorinput}>
                        <div
                          className={s.swatch}
                          style={{
                            background: `${button.theme.palette.tertiary}`,
                          }}
                          onClick={() => setTertiary(!tertiary)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className={s.form_row_checkbox_ctn}>
                    <label>Widget</label>
                    <label className={s.switch}>
                      <input
                        type="checkbox"
                        checked={button.widget}
                        onChange={handleCheckBoxChange}
                        name="widget"
                      />
                      <span className={s.slider}></span>
                    </label>
                  </div>
                </div>
                {advanced && (
                  <>
                    <div className={s.form_row}>
                      <div className={s.form_row_input_ctn}>
                        <label>Goal Amount</label>
                        <input
                          type="text"
                          name="goalAmount"
                          value={button.goalAmount}
                          placeholder="0"
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className={s.form_row_checkbox_ctn}>
                        <label>Random Satoshis</label>
                        <label className={s.switch}>
                          <input
                            type="checkbox"
                            checked={button.randomSatoshis}
                            onChange={handleCheckBoxChange}
                            name="randomSatoshis"
                          />
                          <span className={s.slider}></span>
                        </label>
                      </div>
                    </div>
                    <div className={s.form_row}>
                      <div className={s.form_row_checkbox_ctn}>
                        <label>Hide Toasts</label>
                        <label className={s.switch}>
                          <input
                            type="checkbox"
                            checked={button.hideToasts}
                            onChange={handleCheckBoxChange}
                            name="hideToasts"
                          />
                          <span className={s.slider}></span>
                        </label>
                      </div>
                      <div className={s.form_row_checkbox_ctn}>
                        <label>Disable Focus</label>
                        <label className={s.switch}>
                          <input
                            type="checkbox"
                            checked={button.disableEnforceFocus}
                            onChange={handleCheckBoxChange}
                            name="disableEnforceFocus"
                          />
                          <span className={s.slider}></span>
                        </label>
                      </div>
                    </div>
                    <div className={s.form_row}>
                      <div className={s.form_row_checkbox_ctn}>
                        <label>Disabled</label>
                        <label className={s.switch}>
                          <input
                            type="checkbox"
                            checked={button.disabled}
                            onChange={handleCheckBoxChange}
                            name="disabled"
                          />
                          <span className={s.slider}></span>
                        </label>
                      </div>
                      <div className={s.form_row_checkbox_ctn}>
                        <label>Editable</label>
                        <label className={s.switch}>
                          <input
                            type="checkbox"
                            checked={button.editable}
                            onChange={handleCheckBoxChange}
                            name="editable"
                          />
                          <span className={s.slider}></span>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>
          <div className={s.preview_ctn}>
            <div className={s.preview_label}>Preview</div>
            {button.validAddress === 'ecash' ||
            button.validAddress === 'bitcoincash' ? (
              button.widget ? (
                <PayButtonWidget
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
                  randomSatoshis={button.randomSatoshis}
                  hideToasts={button.hideToasts}
                  disableEnforceFocus={button.disableEnforceFocus}
                  disabled={button.disabled}
                  editable={button.editable}
                />
              ) : (
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
                  randomSatoshis={button.randomSatoshis}
                  hideToasts={button.hideToasts}
                  disableEnforceFocus={button.disableEnforceFocus}
                  disabled={button.disabled}
                  editable={button.editable}
                />
              )
            ) : button.validAddress === 'not valid' &&
              button.to.length !== 0 ? (
              <span style={{ color: 'red' }}>Enter a valid address</span>
            ) : (
              'Enter an address'
            )}
          </div>
        </div>
        <CodeBlock button={button} />
      </div>
    </div>
  );
}
