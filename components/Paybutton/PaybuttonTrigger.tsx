import React, { useEffect, useState } from 'react'
import style from './paybutton.module.css'
// import style_w from '../Wallet/wallet.module.css'
import { PaybuttonTriggerPOSTParameters } from 'utils/validators'
import { useForm } from 'react-hook-form'
import axios from 'axios'
import { PaybuttonTrigger } from '@prisma/client'

interface IProps {
  paybuttonId: string
}
export default ({ paybuttonId }: IProps): JSX.Element => {
  const [error, setError] = useState('')
  const [successText, setSuccessText] = useState('')
  const [clearModal, setClearModal] = useState(false)
  const [currentTriggerId, setCurrentTriggerId] = useState<string>()
  const { register, handleSubmit, reset, setValue, watch } = useForm<PaybuttonTriggerPOSTParameters>()
  const [initialStateURL, setInitialStateURL] = useState<string>()
  const [initialStateData, setInitialStateData] = useState<string>()
  const [disableSubmit, setDisableSubmit] = useState(false)

  const getTrigger = async (): Promise<void> => {
    const response = await axios.get(`/api/paybutton/triggers/${paybuttonId}`)
    const ok = await response.data as PaybuttonTrigger[]
    if (ok.length > 0) {
      const trigger = ok[0]
      setValue('postData', trigger.postData)
      setValue('postURL', trigger.postURL)
      setValue('sendEmail', trigger.sendEmail)
      setInitialStateData(trigger.postData)
      setInitialStateURL(trigger.postURL)
      setCurrentTriggerId(trigger.id)
    }
  }

  const [watchData, watchURL] = watch(['postData', 'postURL'])

  useEffect(() => {
    void getTrigger()
  }, [])

  useEffect(() => {
    if (
      (watchData === initialStateData &&
        watchURL === initialStateURL) ||
      (watchData === '' || watchURL === '')
    ) {
      setDisableSubmit(true)
    } else {
      setDisableSubmit(false)
    }
  }, [initialStateURL, initialStateData, watchData, watchURL])

  async function clearTrigger (): Promise<void> {
    try {
      const response = await axios.delete(`/api/paybutton/triggers/${paybuttonId}`, {
        data: {
          triggerId: currentTriggerId
        }
      })
      if (response.status === 200) {
        reset()
        setError('')
        setSuccessText('Cleared trigger')
        setCurrentTriggerId(undefined)
      }
    } catch (err: any) {
      setSuccessText('')
      setError(err.response.data.message)
    } finally {
      setClearModal(false)
    }
  }

  async function onSubmit (params: PaybuttonTriggerPOSTParameters): Promise<void> {
    try {
      params.currentTriggerId = currentTriggerId
      const response = await axios.post(`/api/paybutton/triggers/${paybuttonId}`, params)
      if (response.status === 200) {
        setError('')
        setSuccessText('Trigger set successfully')
        void getTrigger()
      }
    } catch (err: any) {
      setSuccessText('')
      setError(err.response.data.message)
    }
  }

  return (
    <div>
      <div>
        <h4>When a Payment is Received...</h4>
        <div className={style.form_ctn}>
          <h5>Send request</h5>
          <form onSubmit={(e) => { void handleSubmit(onSubmit)(e) }} method='post'>
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
                Available variables:
              </p>
              <ul>
                <li>&lt;buttonName&gt;</li>
                <li>&lt;address&gt;</li>
                <li>&lt;currency&gt;</li>
                <li>&lt;amount&gt;</li>
                <li>&lt;timestamp&gt;</li>
                <li>&lt;txId&gt;</li>
                <li>&lt;opReturn&gt;</li>
                <li>&lt;signature&gt;</li>
              </ul>
            </div>
            {/* Tooltip */}
            <div >
              <div className={style.tip}>
                {/* Only triggers if payment &gt; X */}
              </div>
              <div className={style.btn_row2}>
                {(error === undefined || error === '') ? null : <div className={style.error_message}>{error}</div>}
                {(successText === undefined || successText === '') ? null : <div className={style.success_message}>{successText}</div>}
                <div>
                  <button disabled={disableSubmit} type='submit' className='button_main'>{currentTriggerId === undefined ? 'Create' : 'Update'}</button>
                </div>
                <div>
                  {
                    currentTriggerId !== undefined &&
                      <button type='button' onClick={() => setClearModal(true)} className={style.delete_btn}>Clear</button>
                  }
                </div>
              </div>
            </div>
          <h5>Receive Email</h5>
            <div className={style.row} key="sendEmail">
              <div className={style.checkbox} >
                <input {...register('sendEmail')} type="checkbox" id="sendEmail" name="sendEmail" />
              </div>
              <label htmlFor="sendEmail">Enabled</label>
            </div>
            <div>
              <label htmlFor="sendEmail">Receive email</label>
              <input {...register('emails')} type="text" id="emails" name="emails" />
            </div>
          </form>
        </div>
      </div>
      {clearModal
        ? (
          <div className={style.form_ctn_outer}>
            <div className={style.form_ctn_inner}>
              <h4>Clear Payment Trigger?</h4>
              <div className={`${style.form_ctn} ${style.delete_button_form_ctn}`}>
                <label htmlFor='name'>Are you sure you want to clear this payment trigger?<br />This action cannot be undone.</label>
                <div className={style.btn_row}>
                  <div>

                    <button onClick={() => { void clearTrigger() }} className={style.delete_confirm_btn}>Yes</button>
                    <button onClick={() => { setClearModal(false) }} className={style.cancel_btn}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          </div>)
        : null}
    </div>
  )
}
