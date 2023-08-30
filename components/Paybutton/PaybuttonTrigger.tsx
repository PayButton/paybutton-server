import React, { useEffect, useState } from 'react'
import style from './paybutton.module.css'
import style_w from '../Wallet/wallet.module.css'
import { PaybuttonTriggerPOSTParameters } from 'utils/validators'
import { useForm } from 'react-hook-form'
import axios from 'axios'
import { PaybuttonTrigger } from '@prisma/client'

interface IProps {
  paybuttonId: string
}
export default ({ paybuttonId }: IProps): JSX.Element => {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [currentTriggerId, setCurrentTriggerId] = useState<string>()
  const { register, handleSubmit, reset, setValue } = useForm<PaybuttonTriggerPOSTParameters>()

  useEffect(() => {
    const getTrigger = async (): Promise<void> => {
      const response = await axios.get(`/api/paybutton/triggers/${paybuttonId}`)
      const ok = await response.data as PaybuttonTrigger[]
      if (ok.length > 0) {
        const trigger = ok[0]
        setValue('postData', trigger.postData)
        setValue('postURL', trigger.postURL)
        setValue('sendEmail', trigger.sendEmail)
        setCurrentTriggerId(trigger.id)
      }
    }
    void getTrigger()
  }, [])

  async function onSubmit (params: PaybuttonTriggerPOSTParameters): Promise<void> {
    try {
      params.currentTriggerId = currentTriggerId
      const response = await axios.post(`/api/paybutton/triggers/${paybuttonId}`, params)
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
        <h4>When a Payment is Received...</h4>
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
              <label htmlFor="postData">Post Data</label>
              <textarea {...register('postData')} id="postData" name="postData" placeholder={`{
    "name": <buttonName>,
              ...
              }`}></textarea>
              <p >
                Options:
              </p>
              <ul>
                <li>buttonName</li>
                <li>paymentAddress</li>
                <li>currency</li>
                <li>amount</li>
                <li>Datetime</li>
                <li>Payload / BIP 70 data (e.g., tx id or other context; think Coin Dance supporters section)</li>
              </ul>
            </div>
            {/* Tooltip */}
            <div >
              <div className={style.tip}>
                Only triggers if payment &gt; X
              </div>
                <div className={style.btn_row2}>
                  {(error === undefined || error === '') ? null : <div className={style.error_message}>{error}</div>}
                  <div>
                    <button type='submit' className='button_main'>{currentTriggerId === undefined ? 'Create' : 'Update'}</button>
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
