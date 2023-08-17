import { useForm } from 'react-hook-form'
import React, { ReactElement, useState } from 'react'
import style from './auth.module.css'
import { sendPasswordResetEmail } from 'supertokens-web-js/recipe/thirdpartyemailpassword'

export default function SignUp (): ReactElement {
  const { register, handleSubmit, reset } = useForm<any>()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const onSubmit = async (values: any): Promise<void> => {
    setDisabled(true)
    const email = values.email
    try {
      const response = await sendPasswordResetEmail({
        formFields: [{
          id: 'email',
          value: email
        }]
      })

      console.log('oia', response)
      if (response.status === 'FIELD_ERROR') {
        response.formFields.forEach(formField => {
          setError(formField.error)
        })
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        setError(err.message)
        reset({ email: '' })
      } else {
        setError('Something went wrong.')
        reset({ email: '' })
      }
    }
    setDisabled(false)
  }
  return (
    success
      ? <><h2>Reset Password</h2><p>If this account is registered, an email was sent.</p><a href="/signin" className={style.smlink}>Back to Sign In</a></>
      : <>
       <h2>Reset Password</h2>
       <p style={{ marginTop: '-10px' }}>Enter your email below to receive a link to reset your password</p>
      <form onSubmit={handleSubmit(onSubmit)} method='post'>
        <label htmlFor='email'>Email</label>
        <input {...register('email')} type='email' id='email' name='email' required style={{ marginBottom: '15px' }} />
        <div>
          <div className={style.error_message}>
            {error !== '' ? <span>{error}</span> : <span></span>}
          </div>
          <button disabled={disabled} type='submit'>Send email</button>
        </div>
        <div>
          <a href="/signin" className={style.smlink}>Back</a>
        </div>
      </form>
    </>
  )
}
