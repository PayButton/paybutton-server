import { useForm } from 'react-hook-form'
import React, { ReactElement, useEffect, useState } from 'react'
import style from './auth.module.css'
import { SignUpPasswordPOSTParameters } from 'utils/validators'
import { submitNewPassword } from 'supertokens-web-js/recipe/thirdpartyemailpassword'

export default function ResetPassword (): ReactElement {
  const { register, handleSubmit, watch } = useForm<any>()
  const [error, setError] = useState('')
  const [disabled, setDisabled] = useState(true)
  async function newPasswordEntered (newPassword: string): Promise<void> {
    const response = await submitNewPassword({
      formFields: [{
        id: 'password',
        value: newPassword
      }]
    })

    if (response.status === 'FIELD_ERROR') {
      response.formFields.forEach(formField => {
        if (formField.id === 'password') {
          // New password did not meet password criteria on the backend.
          setError(formField.error)
        }
      })
    } else if (response.status === 'RESET_PASSWORD_INVALID_TOKEN_ERROR') {
      // the password reset token in the URL is invalid, expired, or already consumed
      setError('Password reset failed. Please try again')
      // window.location.assign("/signin") // back to the login scree.
    } else {
      window.location.assign('/signin')
    }
  }

  const onSubmit = async (values: any): Promise<void> => {
    setDisabled(true)
    await newPasswordEntered(values.password)
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
      <form onSubmit={handleSubmit(onSubmit)} method='post'>
        <label htmlFor='password'>Password</label>
        <input {...register('password')} type='password' id='password' name='password' required />

        <label htmlFor='passwordConfirmed'>Confirm Password</label>
        <input {...register('passwordConfirmed')} type='password' id='passwordConfirmed' name='passwordConfirmed' required />
        <div>
          <div className={style.error_message}>
            {error !== '' ? <span>{error}</span> : <span></span>}
          </div>
          <button disabled={disabled} className='button_main' type='submit'>Submit</button>
        </div>
      </form>
    </>
  )
}
