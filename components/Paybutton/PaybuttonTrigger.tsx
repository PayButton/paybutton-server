import React, { useState } from 'react'
import style from './paybutton.module.css'
import style_w from '../Wallet/wallet.module.css'
import { PaybuttonTriggerPOSTParameters } from 'utils/validators'
import { useForm } from 'react-hook-form'
import axios from 'axios'

interface IProps {
  paybuttonId: string
}
export default ({ paybuttonId }: IProps): JSX.Element => {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { register, handleSubmit, reset } = useForm<PaybuttonTriggerPOSTParameters>()

  async function onSubmit (params: PaybuttonTriggerPOSTParameters): Promise<void> {
    try {
      const response = await axios.post(`/api/paybutton/trigger/${paybuttonId}`, params)
      if (response.status === 200) {
        setSuccess(true)
        reset()
      }
    } catch (err: any) {
      setError(err.response.data.message)
    }
  }

  return (
    <div>
      <div>
        <h4>Set triggers</h4>
        {success
          ? <p>Trigger set successfully</p>
          : <div className={style.form_ctn}>
          <form onSubmit={(e) => { void handleSubmit(onSubmit)(e) }} method='post'>
            {/* Checkbox */}
            <div className={style_w.input_field} key="sendEmail">
              <input {...register('sendEmail')} type="checkbox" id="sendEmail" name="sendEmail" />
              <label htmlFor="sendEmail">Receive email</label>
            </div>

            {/* Input Fields */}
            <div>
              <label htmlFor="postURL">URL:</label>
              <input {...register('postURL')} type="text" id="postURL" name="postURL" />
            </div>

            <div>
              <label htmlFor="postData">Text Area:</label>
              <textarea {...register('postData')} id="postData" name="postData" placeholder="{
                name: <buttonName>,
              ...
              }"></textarea>
              <p >
                Possible placeholders:
                <ul>
                  <li>buttonName</li>
                  <li>paymentAddress</li>
                  <li>currency</li>
                  <li>amount</li>
                  <li>Datetime</li>
                  <li>Payload / BIP 70 data (e.g., tx id or other context; think Coin Dance supporters section)</li>
                </ul>
              </p>
            </div>
            {/* Tooltip */}
            <div >
              <div className={style.tip}>
                Only triggers if payment &gt; X
              </div>
                <div className={style.btn_row2}>
                  {(error === undefined || error === '') ? null : <div className={style.error_message}>{error}</div>}
                  <div>
                    <button type='submit' className='button_main'>Submit</button>
                  </div>
                </div>
            </div>
          </form>
        </div>
        }
      </div>
    </div>
  )
}
