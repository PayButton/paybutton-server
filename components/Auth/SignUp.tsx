import { useForm } from 'react-hook-form'
import React, { ReactElement, useEffect, useState } from 'react'
import style from './auth.module.css'
import { signUp } from 'supertokens-web-js/recipe/emailpassword'
import { SignUpPasswordPOSTParameters } from 'utils/validators'

export default function SignUp (): ReactElement {
  const { register, handleSubmit, watch, reset } = useForm<any>()
  const [error, setError] = useState('')
  const [disabled, setDisabled] = useState(true)
  const onSubmit = async (values: any): Promise<void> => {
    setDisabled(true)

    const email = values.email
    const password = values.password
    try {
      const response = await signUp({
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
          // Email validation failed (for example incorrect email syntax).
          setError(formField.error)
        })
      } else {
        // sign up successful. The session tokens are automatically handled by
        // the frontend SDK.
        window.location.href = '/verify'
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

  const noEmptyValues = (value: SignUpPasswordPOSTParameters): boolean => {
    return (
      value.password !== '' &&
      value.passwordConfirmed !== ''
    )
  }

  const doPasswordsMatch = (value: SignUpPasswordPOSTParameters): boolean => {
    return (
      value.password === value.passwordConfirmed ||
      value.passwordConfirmed === ''
    )
  }

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (!doPasswordsMatch(value)) {
        setError('Passwords do not match.')
        setDisabled(true)
      } else {
        setError('')
        if (noEmptyValues(value)) {
          setDisabled(false)
        }
      }
    })
    return () => subscription.unsubscribe()
  })

  return (
    <>
      <h2>Sign Up</h2>
      <form onSubmit={(e) => { void handleSubmit(onSubmit)(e) }} method='post'>
        <label htmlFor='email'>Email</label>
        <input {...register('email')} type='email' id='email' name='email' required />

        <label htmlFor='password'>Password</label>
        <input {...register('password')} type='password' id='password' name='password' required />

        <label htmlFor='passwordConfirmed'>Confirm Password</label>
        <input {...register('passwordConfirmed')} type='password' id='passwordConfirmed' name='passwordConfirmed' required className={style.confitm_pw} />
        <div>
          <div className={style.error_message}>
            {error !== '' ? <span>{error}</span> : <span></span>}
          </div>
          <button disabled={disabled} type='submit' className='button_main'>Submit</button>
        </div>
      </form>
      <div className={style.signup_ctn}>
        Already have an account? <a href="signin/" className={style.link}>Sign in</a>
      </div>
    </>
  )
}
