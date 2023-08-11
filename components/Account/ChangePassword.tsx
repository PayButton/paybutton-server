import React, { ReactElement, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { PasswordPOSTParameters } from 'utils/validators'
import style from './account.module.css'

interface IProps {
  onSubmit: Function
}

export default function ChangePassword ({ onSubmit }: IProps): ReactElement {
  const { register, handleSubmit, watch } = useForm<PasswordPOSTParameters>()
  const [ error, setError ] = useState('')

  const doPasswordsMatch = (value: PasswordPOSTParameters): boolean => {
    return (
      value.newPassword === value.newPasswordConfirmed ||
      value.newPasswordConfirmed === ''
    )

  }

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      console.log(value, name, type)
      if (!doPasswordsMatch(value)) {
        setError('Passwords do not match')
      } else {
        setError('')
      }
    })
    return () => subscription.unsubscribe()
  })

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} method='post'>
        <label htmlFor='oldPassword'>Old password:</label>
        <input {...register('oldPassword')} type='password' id='oldPassword' name='oldPassword' required />

        <label htmlFor='newPassword'>New password:</label>
        <input {...register('newPassword')} type='password' id='newPassword' name='newPassword' required />

        <label htmlFor='newPasswordConfirmed'>Confirm new password:</label>
        <input {...register('newPasswordConfirmed')} type='password' id='newPasswordConfirmed' name='newPasswordConfirmed' required />
        <div>
          {error !== '' && <div className={style.error_message}>{error}</div> }
          <button type='submit'>Submit</button>
        </div>
      </form>
    </>
  )
}
