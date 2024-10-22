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

type TriggerType = 'poster' | 'email'

export default ({ paybuttonId }: IProps): JSX.Element => {
  const [posterError, setPosterError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [posterSuccessText, setPosterSuccessText] = useState('')
  const [emailSuccessText, setEmailSuccessText] = useState('')
  const [clearModal, setClearModal] = useState<TriggerType | undefined>()
  const [currentPosterTriggerId, setCurrentPosterTriggerId] = useState<string>()
  const [currentEmailTriggerId, setCurrentEmailTriggerId] = useState<string>()
  const { register: registerPosterTrigger, handleSubmit: handleSubmitPosterTrigger, reset: resetPosterTrigger, setValue: setValuePosterTrigger, watch: watchPosterTrigger } = useForm<PaybuttonTriggerPOSTParameters>()
  const { register: registerEmailTrigger, handleSubmit: handleSubmitEmailTrigger, reset: resetEmailTrigger, setValue: setValueEmailTrigger, watch: watchEmailTrigger } = useForm<PaybuttonTriggerPOSTParameters>()
  const [initialStateURL, setInitialStateURL] = useState<string>()
  const [initialStateData, setInitialStateData] = useState<string>()
  const [initialStateEmails, setInitialStateEmails] = useState<string>()
  const [disablePosterSubmit, setDisablePosterSubmit] = useState(false)
  const [disableEmailSubmit, setDisableEmailSubmit] = useState(false)

  const getTriggers = async (): Promise<void> => {
    const response = await axios.get(`/api/paybutton/triggers/${paybuttonId}`)
    const triggers = await response.data as PaybuttonTrigger[]
    for (const trigger of triggers) {
      const isEmailTrigger = trigger.postURL === ''
      if (isEmailTrigger) {
        setValueEmailTrigger('emails', trigger.emails)
        setCurrentEmailTriggerId(trigger.id)
        setInitialStateEmails(trigger.emails)
      } else {
        setValuePosterTrigger('postData', trigger.postData)
        setValuePosterTrigger('postURL', trigger.postURL)
        setInitialStateData(trigger.postData)
        setInitialStateURL(trigger.postURL)
        setCurrentPosterTriggerId(trigger.id)
      }
    }
  }

  const [watchPostData, watchPostURL] = watchPosterTrigger(['postData', 'postURL'])
  const [watchEmails] = watchEmailTrigger(['emails'])

  useEffect(() => {
    setValuePosterTrigger('isEmailTrigger', false)
    setValueEmailTrigger('isEmailTrigger', true)
    void getTriggers()
  }, [])

  useEffect(() => {
    if (
      (watchPostData === initialStateData &&
        watchPostURL === initialStateURL) ||
      (watchPostData === '' || watchPostURL === '')
    ) {
      setDisablePosterSubmit(true)
    } else {
      setDisablePosterSubmit(false)
    }
    if (watchEmails === initialStateEmails || watchEmails === '') {
      setDisableEmailSubmit(true)
    } else {
      setDisableEmailSubmit(false)
    }
  }, [initialStateURL, initialStateData, watchPostData, watchPostURL, initialStateEmails, watchEmails])

  function getDeleteTriggerHandler (triggerType: TriggerType): () => Promise<void> {
    let triggerToDelete: string | undefined
    let setError: Function
    let setSuccess: Function
    let setCurrentTriggerId: Function
    let resetForm: Function
    switch (triggerType) {
      case 'email':
        triggerToDelete = currentEmailTriggerId
        setError = setEmailError
        setSuccess = setEmailSuccessText
        setCurrentTriggerId = setCurrentEmailTriggerId
        resetForm = resetEmailTrigger
        break
      case 'poster':
        triggerToDelete = currentPosterTriggerId
        setError = setPosterError
        setSuccess = setPosterSuccessText
        setCurrentTriggerId = setCurrentPosterTriggerId
        resetForm = resetPosterTrigger
    }

    return async () => {
      try {
        const response = await axios.delete(`/api/paybutton/triggers/${paybuttonId}`, {
          data: {
            triggerId: triggerToDelete
          }
        })
        if (response.status === 200) {
          resetForm()
          setError('')
          setSuccess('Cleared trigger')
          setCurrentTriggerId(undefined)
        }
      } catch (err: any) {
        setSuccess('')
        setError(err.response.data.message)
      } finally {
        setClearModal(undefined)
      }
    }
  }

  function getSubmitTriggerHandler (triggerType: TriggerType): (params: PaybuttonTriggerPOSTParameters) => Promise<void> {
    let currentTriggerId: string | undefined
    let setError: Function
    let setSuccess: Function
    switch (triggerType) {
      case 'email':
        currentTriggerId = currentEmailTriggerId
        setError = setEmailError
        setSuccess = setEmailSuccessText
        break
      case 'poster':
        currentTriggerId = currentPosterTriggerId
        setError = setPosterError
        setSuccess = setPosterSuccessText
    }

    return async (params: PaybuttonTriggerPOSTParameters) => {
      try {
        params.currentTriggerId = currentTriggerId
        const response = await axios.post(`/api/paybutton/triggers/${paybuttonId}`, params)
        if (response.status === 200) {
          setError('')
          setSuccess('Trigger set successfully')
          void getTriggers()
        }
      } catch (err: any) {
        setSuccess('')
        setError(err.response.data.message)
      }
    }
  }

  return (
    <div>
      <div>
        <h4>When a Payment is Received...</h4>
        <div className={style.form_ctn}>
          <h5>Send request</h5>
          <form onSubmit={(e) => { void handleSubmitPosterTrigger(getSubmitTriggerHandler('poster'))(e) }} method='post'>
            <div>
              <label htmlFor="postURL">URL:</label>
              <input {...registerPosterTrigger('postURL')} type="text" id="postURL" name="postURL" />
            </div>

            <div>
              <label htmlFor="postData">Post Data</label>
              <textarea {...registerPosterTrigger('postData')} id="postData" name="postData" placeholder={`{
    "name": <buttonName>,
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
                {(posterError === undefined || posterError === '') ? null : <div className={style.error_message}>{posterError}</div>}
                {(posterSuccessText === undefined || posterSuccessText === '') ? null : <div className={style.success_message}>{posterSuccessText}</div>}
                <div>
                  <button disabled={disablePosterSubmit} type='submit' className='button_main'>{currentPosterTriggerId === undefined ? 'Create' : 'Update'}</button>
                </div>
                <div>
                  {
                    currentPosterTriggerId !== undefined &&
                      <button type='button' onClick={() => setClearModal('poster')} className={style.delete_btn}>Clear</button>
                  }
                </div>
              </div>
            </div>
            </form>
          <form onSubmit={(e) => { void handleSubmitEmailTrigger(getSubmitTriggerHandler('email'))(e) }} method='post'>
            <h5>Receive Email</h5>
            <div>
              <label htmlFor="emails">Receive email</label>
              <input {...registerEmailTrigger('emails')} type="text" id="emails" name="emails" />
            </div>
            <div>
              <div className={style.btn_row2}>
                {(emailError === undefined || emailError === '') ? null : <div className={style.error_message}>{emailError}</div>}
                {(emailSuccessText === undefined || emailSuccessText === '') ? null : <div className={style.success_message}>{emailSuccessText}</div>}
                <div>
                  <button disabled={disableEmailSubmit} type='submit' className='button_main'>{currentEmailTriggerId === undefined ? 'Create' : 'Update'}</button>
                </div>
                <div>
                  {
                    currentEmailTriggerId !== undefined &&
                      <button type='button' onClick={() => setClearModal('email')} className={style.delete_btn}>Clear</button>
                  }
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
      {clearModal !== undefined
        ? (
          <div className={style.form_ctn_outer}>
            <div className={style.form_ctn_inner}>
              <h4>Clear Payment Trigger?</h4>
              <div className={`${style.form_ctn} ${style.delete_button_form_ctn}`}>
                <label htmlFor='name'>Are you sure you want to clear this payment trigger?<br />This action cannot be undone.</label>
                <div className={style.btn_row}>
                  <div>
                    <button onClick={() => { void getDeleteTriggerHandler(clearModal)() }} className={style.delete_confirm_btn}>Yes</button>
                    <button onClick={() => { setClearModal(undefined) }} className={style.cancel_btn}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          </div>)
        : null}
    </div>
  )
}
