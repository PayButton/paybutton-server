import { useState } from 'react';
import s from './button-generator.module.css';
import style from '/styles/landing.module.css';
import { PayButton, Widget as PayButtonWidget } from '@paybutton/react';
import { ChromePicker } from 'react-color';
import CodeBlock from './CodeBlock';

export default function ButtonGenerator(): JSX.Element {
  const currencies = ['XEC', 'BCH', 'SAT', 'USD', 'CAD', 'EUR', 'GBP', 'AUD'];
  const animations = ['slide', 'invert', 'none'];
  const [primary, setPrimary] = useState(false);
  const [secondary, setSecondary] = useState(false);
  const [tertiary, setTertiary] = useState(false);

  const [button, setButton] = useState({
    to: 'bitcoincash:qrmm7edwuj4jf7tnvygjyztyy0a0qxvl7q9ayphulp',
    amount: 0,
    currency: 'BCH',
    text: 'Donate',
    hoverText: 'Click to send',
    successText: 'Thanks for your support!',
    animation: 'slide',
    theme: {
      palette: {
        primary: '#669cfe',
        secondary: '#FFFFFF',
        tertiary: '#231f20',
      },
    },
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
                  <div>To</div>
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
                  value={button.to}
                  onChange={handleInputChange}
                />

                <label>Text</label>
                <input
                  type="text"
                  name="text"
                  value={button.text}
                  onChange={handleInputChange}
                />

                <label>Hover Text</label>
                <input
                  type="text"
                  name="hoverText"
                  value={button.hoverText}
                  onChange={handleInputChange}
                />

                <label>Success Text</label>
                <input
                  type="text"
                  name="successText"
                  value={button.successText}
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
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label>Currency</label>
                    <select
                      name="currency"
                      value={button.currency}
                      onChange={handleInputChange}
                    >
                      {currencies.map((currency, index) => (
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
                  <div
                    className={s.swatch}
                    style={{ background: `${button.theme.palette.primary}` }}
                    onClick={() => setPrimary(!primary)}
                  />
                  <input
                    type="text"
                    className={s.colorinput}
                    name="primary"
                    value={button.theme.palette.primary}
                    onChange={handleInputChange}
                  />
                </div>
                <label>Secondary Color</label>
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
                  <div
                    className={s.swatch}
                    style={{ background: `${button.theme.palette.secondary}` }}
                    onClick={() => setSecondary(!secondary)}
                  />
                  <input
                    type="text"
                    name="secondary"
                    className={s.colorinput}
                    value={button.theme.palette.secondary}
                    onChange={handleInputChange}
                  />
                </div>
                <label>Tertiary Color</label>
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
                  <div
                    className={s.swatch}
                    style={{ background: `${button.theme.palette.tertiary}` }}
                    onClick={() => setTertiary(!tertiary)}
                  />
                  <input
                    type="text"
                    name="tertiary"
                    className={s.colorinput}
                    value={button.theme.palette.tertiary}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </form>
          </div>
          <div className={s.preview_ctn}>
            <div className={s.preview_label}>Preview</div>
            <PayButton
              to={button.to}
              amount={button.amount}
              currency={button.currency}
              text={button.text}
              hoverText={button.hoverText}
              theme={button.theme}
              animation={button.animation}
            />
          </div>
        </div>
        <CodeBlock button={button} />
      </div>
    </div>
  );
}
