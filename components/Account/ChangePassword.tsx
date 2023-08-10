import React, { ReactElement, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { PasswordPOSTParameters } from 'utils/validators'
import style from './account.module.css'

export default function ChangePassword (): ReactElement {
  const { register, handleSubmit, reset, watch } = useForm<PasswordPOSTParameters>()
  const [ error, setError ] = useState('')
  const [ success, setSuccess ] = useState('')

  const onSubmit = async (values: PasswordPOSTParameters): Promise<void> => {
    const res = await fetch('/api/user/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(values)
    })
    const json = await res.json()
    if (res.status === 200) {
      reset()
      setError('')
      setSuccess('Password changed successfully')
    } else {
      setSuccess('')
      reset({oldPassword: ''})
      setError(json.message)
    }
  }


  const doPasswordsMatch = (value: PasswordPOSTParameters): boolean => {
    return (
      value.newPassword === value.newPasswordConfirmed ||
      value.newPasswordConfirmed === ''
    )

  }

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
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
      {success !== '' && <div className={style.success_message}>{success}</div> }
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
