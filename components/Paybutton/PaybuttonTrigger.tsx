import React, { useEffect, useState } from 'react'
import style from './paybutton.module.css'
// import style_w from '../Wallet/wallet.module.css'
import { PaybuttonTriggerPOSTParameters } from 'utils/validators'
import { useForm } from 'react-hook-form'
import axios from 'axios'
import { PaybuttonTrigger } from '@prisma/client'
import { MAX_DAILY_EMAILS } from 'constants/index'

interface IProps {
  paybuttonId: string
  emailCredits: number
}

type TriggerType = 'poster' | 'email'

export default ({ paybuttonId, emailCredits }: IProps): JSX.Element => {
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
        setTimeout(() => {
          setSuccess('')
          setError('')
        }, 3000)
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
      } finally {
        setTimeout(() => {
          setSuccess('')
          setError('')
        }, 3000)
      }
    }
  }

  return (
    <div>
      <div>
        <h4>When a Payment is Received...</h4>
        <div className={style.trigger_ctn}>
          <div className={style.form_ctn}>
            <div className={style.trigger_header}>
              <h5>Send Request</h5>
              {currentPosterTriggerId !== undefined && <div className={style.active_label}>Active</div>}
            </div>
            <form
              onSubmit={(e) => {
                void handleSubmitPosterTrigger(
                  getSubmitTriggerHandler('poster')
                )(e)
              }}
              method="post"
            >
              <div>
                <label htmlFor="postURL">URL</label>
                <input
                  {...registerPosterTrigger('postURL')}
                  type="text"
                  id="postURL"
                  name="postURL"
                  placeholder='The URL that will receive the request'
                />
              </div>

              <div>
                <label htmlFor="postData">Post Data</label>
                <textarea
                  {...registerPosterTrigger('postData')}
                  className={style.post_data_area}
                  id="postData"
                  name="postData"
                  placeholder={`{
  "myButtonName": <buttonName>,
  "txId": <txId>,
  "...
}`}
                ></textarea>
                <p>Available variables:</p>
                <div className={style.variables_list}>
                  <div>&lt;buttonName&gt;</div>
                  <div>&lt;address&gt;</div>
                  <div>&lt;currency&gt;</div>
                  <div>&lt;amount&gt;</div>
                  <div>&lt;timestamp&gt;</div>
                  <div>&lt;txId&gt;</div>
                  <div>&lt;opReturn&gt;</div>
                  <div>&lt;signature&gt;</div>
                  <div>&lt;inputAddresses&gt;</div>
                  <div>&lt;value&gt;</div>

                </div>
              </div>
              {/* Tooltip */}
              <div>
                <div className={style.tip}>
                  {/* Only triggers if payment &gt; X */}
                </div>

                <div className={style.trigger_btn_row}>

                {posterError === undefined || posterError === ''
                  ? null
                  : (
                    <div className={style.error_message_}>{posterError}</div>
                    )}
                  {posterSuccessText === undefined ||
                  posterSuccessText === ''
                    ? null
                    : (
                    <div className={style.success_message_}>
                      {posterSuccessText}
                    </div>
                      )}
                  {currentPosterTriggerId !== undefined && (
                      <button
                        type="button"
                        onClick={() => setClearModal('poster')}
                        className={style.trigger_delete_btn}
                      >
                        Delete
                      </button>
                  )}
                  <button
                    disabled={disablePosterSubmit}
                    type="submit"
                    className="button_main"
                  >
                    {currentPosterTriggerId === undefined
                      ? 'Create Send Request'
                      : 'Update Send Request'}
                  </button>

                </div>
              </div>
            </form>
          </div>

          <div className={style.form_ctn}>
            <div className={style.trigger_header}>
              <h5>Send Email</h5>
              {currentEmailTriggerId !== undefined && <div className={style.active_label}>Active</div>}
            </div>
            <form
              onSubmit={(e) => {
                void handleSubmitEmailTrigger(getSubmitTriggerHandler('email'))(
                  e
                )
              }}
              method="post"
            >

                <label htmlFor="emails">Email</label>
                <input
                  {...registerEmailTrigger('emails')}
                  type="text"
                  id="emails"
                  name="emails"
                />
                <div className={style.email_credits_info}>
                    {emailCredits < MAX_DAILY_EMAILS
                      ? (
                      <span>
                        You have sent <b>{MAX_DAILY_EMAILS - emailCredits}</b>{' '}
                        of a daily maximum of <b>{MAX_DAILY_EMAILS}</b> emails.
                      </span>
                        )
                      : (
                      <span>
                        You may send up to <b>{MAX_DAILY_EMAILS}</b> emails per
                        day.
                      </span>
                        )}
                </div>

              <div>
                <div className={style.trigger_btn_row}>
                  {emailError === undefined || emailError === ''
                    ? null
                    : (
                    <div className={style.error_message_}>{emailError}</div>
                      )}
                  {emailSuccessText === undefined ||
                  emailSuccessText === ''
                    ? null
                    : (
                    <div className={style.success_message_}>
                      {emailSuccessText}
                    </div>
                      )}
                  {currentEmailTriggerId !== undefined && (
                      <button
                        type="button"
                        onClick={() => setClearModal('email')}
                        className={style.trigger_delete_btn}
                      >
                        Delete
                      </button>
                  )}
                    <button
                      disabled={disableEmailSubmit}
                      type="submit"
                      className="button_main"
                    >
                      {currentEmailTriggerId === undefined
                        ? 'Create Send Email'
                        : 'Update Send Email'}
                    </button>

                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      {clearModal !== undefined
        ? (
        <div className={style.form_ctn_outer}>
          <div className={style.form_ctn_inner}>
            <h4>Clear Payment Trigger?</h4>
            <div
              className={`${style.form_ctn} ${style.delete_button_form_ctn}`}
            >
              <label htmlFor="name">
                Are you sure you want to clear this payment trigger?
                <br />
                This action cannot be undone.
              </label>
              <div className={style.btn_row}>
                <div>
                  <button
                    onClick={() => {
                      void getDeleteTriggerHandler(clearModal)()
                    }}
                    className={style.delete_confirm_btn}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => {
                      setClearModal(undefined)
                    }}
                    className={style.cancel_btn}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
          )
        : null}
    </div>
  )
}
