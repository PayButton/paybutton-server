import { useForm } from 'react-hook-form'
import React, { ReactElement, useState } from 'react'
import style from './auth.module.css'
import { emailPasswordSignUp } from 'supertokens-web-js/recipe/thirdpartyemailpassword'

export default function SignUp (): ReactElement {
  const { register, handleSubmit, reset } = useForm<any>()
  const [error, setError] = useState('')
  const [disabled, setDisabled] = useState(false)
  const onSubmit = async (values: any): Promise<void> => {
    setDisabled(true)

    const email = values.email
    const password = values.password
    try {
      const response = await emailPasswordSignUp({
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
        // sign in successful. The session tokens are automatically handled by
        // the frontend SDK.
        window.location.href = '/'
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
  console.log(onSubmit, handleSubmit)
  return (
    <>
      <form method='post'>
        <label htmlFor='email'>Email</label>
        <input {...register('email')} type='email' id='email' name='email' required />

        <label htmlFor='password'>Password</label>
        <input {...register('password')} type='password' id='password' name='password' required />

        <label htmlFor='passwordConfirmed'>Confirm Password</label>
        <input {...register('passwordConfirmed')} type='password' id='passwordConfirmed' name='passwordConfirmed' required />
        <div>
          <div className={style.error_message}>
            {error !== '' ? <span>{error}</span> : <span></span>}
          </div>
          <button disabled={disabled} type='submit'>Submit</button>
        </div>
      </form>
      Already have an account? <a href="signin/" className={style.link}>Sign in</a>
    </>
  )
}
