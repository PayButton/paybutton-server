import { useState } from 'react';
import s from './button-generator.module.css';
import style from '/styles/landing.module.css';
import { PayButton } from '@paybutton/react';
import { ChromePicker } from 'react-color';
import CodeBlock from './CodeBlock';
import { decode } from 'ecashaddrjs';

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
  const [secondary, setSecondary] = useState(false);
  const [tertiary, setTertiary] = useState(false);

  const [button, setButton] = useState({
    to: '',
    hoverText: 'Click to send',
    currency: 'XEC',
    animation: 'slide',
    theme: {
      palette: {
        primary: '#0074C2',
        secondary: '#FFFFFF',
        tertiary: '#231f20',
      },
    },
    validAddress: '',
    currencies: ['XEC', 'USD', 'CAD', 'EUR', 'GBP', 'AUD'],
  });

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
              prevButton.theme.palette.primary !== '#0074C2' &&
              prevButton.theme.palette.primary !== '#4bc846'
                ? prevButton.theme.palette.primary
                : isValidAddress(value) === 'bitcoincash'
                ? '#4bc846'
                : '#0074C2',
          },
        },
      }));
    } else if (name === 'amount') {
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

  const handleColorChange = (color) => {
    setButton((prevButton) => ({
      ...prevButton,
      theme: {
        ...prevButton.theme,
        palette: {
          ...prevButton.theme.palette,
          primary: color.hex,
        },
      },
    }));
  };

  const handleColorChange2 = (color) => {
    setButton((prevButton) => ({
      ...prevButton,
      theme: {
        ...prevButton.theme,
        palette: {
          ...prevButton.theme.palette,
          secondary: color.hex,
        },
      },
    }));
  };

  const handleColorChange3 = (color) => {
    setButton((prevButton) => ({
      ...prevButton,
      theme: {
        ...prevButton.theme,
        palette: {
          ...prevButton.theme.palette,
          tertiary: color.hex,
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
                  placeholder="Click to send"
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
                <div className={s.advanced_ctn}>
                  For more information and advanced features read our{' '}
                  <a
                    href="https://paybutton.org/#/?id=what-is-paybutton"
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
                <label>Primary Color</label>
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
                          onChange={handleColorChange}
                        />
                      </div>
                    </>
                  )}
                  <div className={s.colorinput}>
                    <div
                      className={s.swatch}
                      style={{ background: `${button.theme.palette.primary}` }}
                      onClick={() => setPrimary(!primary)}
                    />
                  </div>
                </div>
                <div className={s.secondary_color_ctn}>
                  <div>
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
                              onChange={handleColorChange2}
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
                              onChange={handleColorChange3}
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
                </div>
              </div>
            </form>
          </div>
          <div className={s.preview_ctn}>
            <div className={s.preview_label}>Preview</div>
            {button.validAddress === 'ecash' ||
            button.validAddress === 'bitcoincash' ? (
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
