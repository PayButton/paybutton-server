import { useForm } from 'react-hook-form'
import React, { ReactElement, useState } from 'react'
import style from './auth.module.css'
import { signIn } from 'supertokens-web-js/recipe/emailpassword'

export default function SignIn (): ReactElement {
  const { register, handleSubmit, reset } = useForm<any>()
  const [error, setError] = useState('')
  const [disabled, setDisabled] = useState(false)
  const onSubmit = async (values: any): Promise<void> => {
    setDisabled(true)
    const email = values.email
    const password = values.password
    try {
      const response = await signIn({
        formFields: [{
          id: 'email',
          value: email
        }, {
          id: 'password',
          value: password
        }]
      })

      if (response.status === 'FIELD_ERROR') {
        response.formFields.forEach(formField => {
          setError(formField.error)
        })
      } else if (response.status === 'WRONG_CREDENTIALS_ERROR') {
        setError('Incorrect email or password.')
        reset({ password: '' })
      } else {
        // sign in successful. The session tokens are automatically handled by
        // the frontend SDK.
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        setError(err.message)
        reset({ password: '' })
      } else {
        setError('Something went wrong.')
        reset({ password: '' })
      }
    }
    setDisabled(false)
  }
  return (
    <>
      <h2>Sign In</h2>
      <form onSubmit={() => { void handleSubmit(onSubmit) }} method='post'>
        <label htmlFor='email'>Email</label>
        <input {...register('email')} type='email' id='email' name='email' required />

        <label htmlFor='password'>Password</label>
        <input {...register('password')} type='password' id='password' name='password' required />
        <a href="reset-password/" className={style.forgot_pw}>Forgot my password</a>
        <div>
          <div className={style.error_message}>
            {error !== '' ? <span>{error}</span> : <span></span>}
          </div>
          <button disabled={disabled} className="button_main" type='submit'>Submit</button>
        </div>
      </form>
      <div className={style.signup_ctn}>
        Don't have an account? <a href="signup/" className={style.link}>Sign up now</a>
      </div>
    </>
  )
}
