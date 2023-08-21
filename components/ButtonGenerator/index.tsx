import { useState } from 'react';
import s from './button-generator.module.css';
import style from '/styles/landing.module.css';

export default function ButtonGenerator(): JSX.Element {
  const [isCopied, setIsCopied] = useState(false);

  const currencies = ['XEC', 'BCH', 'SAT', 'USD', 'CAD', 'EUR', 'GBP', 'AUD'];

  const animations = ['slide', 'invert', 'none'];

  return (
    <div className={s.bg_ctn}>
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
                <label>To</label>
                <input
                  type="text"
                  id="to"
                  name="to"
                  placeholder="Your address"
                />

                <label>Text</label>
                <input type="text" id="text" name="text" placeholder="Donate" />

                <label>Hover Text</label>
                <input
                  type="text"
                  id="hover-text"
                  name="hover-text"
                  placeholder="Click to send XEC"
                />

                <label>Success Text</label>
                <input
                  type="text"
                  id="success-text"
                  name="success-text"
                  placeholder="Thanks for your support!"
                />
              </div>

              <div className={s.form_half}>
                <div className={s.input_ctn}>
                  <div className={s.amount_ctn}>
                    <label>Amount</label>
                    <input
                      type="text"
                      id="amount"
                      name="amount"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label>Currency</label>
                    <select name="currency" id="currency">
                      {currencies.map((currency, index) => (
                        <option value={currency} key={index}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label>Animation</label>
                <select name="animation" id="animation">
                  {animations.map((currency, index) => (
                    <option value={currency} key={index}>
                      {currency}
                    </option>
                  ))}
                </select>
                <label>Primary Color</label>
                <input
                  type="text"
                  id="primary-color"
                  name="primary-color"
                  placeholder="#669cfe"
                />
                <div className={s.color_ctn}>
                  <div>
                    <label>Secondary Color</label>
                    <input
                      type="text"
                      id="secondary-color"
                      name="secondary-color"
                      placeholder="#f8fdf8"
                    />
                  </div>
                  <div>
                    <label>Tertiary Color</label>
                    <input
                      type="text"
                      id="tertiary-color"
                      name="tertiary-color"
                      placeholder="#374936"
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div className={s.preview_ctn}>Button</div>
        </div>
      </div>
    </div>
  );
}
